  /**
 * Generic Repository Pattern for SQLite (sql.js)
 * 
 * Provides CRUD operations. Handles JSON serialization for nested objects.
 * Uses sql.js synchronous API (runs in-process, no native deps).
 */

import { v4 as uuid } from "uuid";
import { getDB, saveToDisk } from "./index";

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: string;
  order?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Fields stored as JSON strings in SQLite
const JSON_FIELDS: Record<string, string[]> = {
  organizations: ["address", "settings", "subscriptionPlan", "modules", "notificationSettings", "security", "backupSettings", "taxSettings"],
  users: ["organizations", "permissions"],
  invoices: ["lineItems"], bills: ["lineItems"], estimates: ["lineItems"],
  credit_notes: ["lineItems"], purchase_orders: ["lineItems"], journal_entries: ["lineItems"],
  products: ["variants", "bundleItems", "suppliers", "images", "customFields"],
  employees: ["address", "allowances", "bankDetails", "taxInfo"],
  payroll_runs: ["employeePayments"],
  customers: ["address"], vendors: ["address", "bankDetails"],
  projects: ["members", "tags"], budgets: ["lineItems"],
  crm_contacts: ["tags", "customFields"], pos_sales: ["lineItems", "splitPayments"],
  bill_of_materials: ["materials"],
  requisitions: ["items"], goods_received: ["items"],
  work_orders: ["operations"],
  recurring_invoices: ["lineItems"], recurring_journals: ["lineItems"],
  bank_rules: ["conditions", "actions"],
  roles: ["permissions"],
};

export class Repository<T extends { id?: string }> {
  constructor(private tableName: string) {}

  create(data: Partial<T> & { organizationId?: string }): T {
    const db = getDB();
    const id = (data as any).id || uuid();
    const now = new Date().toISOString();
    const record: any = { ...data, id, createdAt: now, updatedAt: now, _dirty: 1, _syncVersion: 0 };

    // Serialize JSON fields
    const jsonFields = JSON_FIELDS[this.tableName] || [];
    for (const field of jsonFields) {
      if (record[field] !== undefined && typeof record[field] !== "string") {
        record[field] = JSON.stringify(record[field]);
      }
    }

    const keys = Object.keys(record);
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map((k) => record[k] ?? null);

    db.run(`INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`, values);
    this.logSync("create", id, record);
    saveToDisk();
    return this.findById(id)!;
  }

  findById(id: string): T | null {
    const db = getDB();
    const stmt = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.deserialize(row);
    }
    stmt.free();
    return null;
  }

  find(options: QueryOptions = {}): T[] {
    const db = getDB();
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (options.where && Object.keys(options.where).length > 0) {
      const conditions = Object.entries(options.where).map(([key, value]) => {
        if (value === null) return `${key} IS NULL`;
        if (typeof value === "object" && value.$like) { params.push(`%${value.$like}%`); return `${key} LIKE ?`; }
        if (typeof value === "object" && value.$ne !== undefined) { params.push(value.$ne); return `${key} != ?`; }
        if (typeof value === "object" && value.$gte !== undefined) { params.push(value.$gte); return `${key} >= ?`; }
        if (typeof value === "object" && value.$lte !== undefined) { params.push(value.$lte); return `${key} <= ?`; }
        params.push(value);
        return `${key} = ?`;
      });
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    if (options.orderBy) query += ` ORDER BY ${options.orderBy} ${options.order || "DESC"}`;
    if (options.limit) { query += ` LIMIT ?`; params.push(options.limit); }
    if (options.offset) { query += ` OFFSET ?`; params.push(options.offset); }

    const results: T[] = [];
    const stmt = db.prepare(query);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(this.deserialize(stmt.getAsObject()));
    }
    stmt.free();
    return results;
  }

  findPaginated(options: QueryOptions & { page?: number; pageSize?: number }): PaginatedResult<T> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const total = this.count(options.where);
    const data = this.find({ ...options, limit: pageSize, offset });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  count(where?: Record<string, any>): number {
    const db = getDB();
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];
    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        if (value === null) return `${key} IS NULL`;
        params.push(value);
        return `${key} = ?`;
      });
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    const stmt = db.prepare(query);
    stmt.bind(params);
    stmt.step();
    const result = stmt.getAsObject() as any;
    stmt.free();
    return result.count || 0;
  }

  update(id: string, data: Partial<T>): T | null {
    const db = getDB();
    const now = new Date().toISOString();
    const record: any = { ...data, updatedAt: now, _dirty: 1 };
    delete record.id; delete record.createdAt;
    delete record._id; delete record.__v;

    const jsonFields = JSON_FIELDS[this.tableName] || [];
    for (const field of jsonFields) {
      if (record[field] !== undefined && typeof record[field] !== "string") {
        record[field] = JSON.stringify(record[field]);
      }
    }

    // Only update columns that exist in the table
    const validCols = this.getTableColumns();
    const keys = Object.keys(record).filter(k => validCols.includes(k));
    if (keys.length === 0) return this.findById(id);

    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = [...keys.map((k) => record[k] ?? null), id];

    db.run(`UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`, values);
    this.logSync("update", id, record);
    saveToDisk();
    return this.findById(id);
  }

  softDelete(id: string, deletedBy?: string): boolean {
    const db = getDB();
    const now = new Date().toISOString();
    db.run(`UPDATE ${this.tableName} SET del_flag = 1, deletedBy = ?, updatedAt = ?, _dirty = 1 WHERE id = ?`, [deletedBy || null, now, id]);
    this.logSync("delete", id, { del_flag: 1 });
    saveToDisk();
    return true;
  }

  findOne(where: Record<string, any>): T | null {
    const results = this.find({ where, limit: 1 });
    return results[0] || null;
  }

  bulkUpsert(records: Partial<T>[]): number {
    const db = getDB();
    const validCols = this.getTableColumns();
    let count = 0;

    for (const rawRecord of records) {
      try {
        // Map MongoDB _id to SQLite id, strip Mongo fields
        const record: any = { ...rawRecord };
        if (record._id && !record.id) {
          record.id = typeof record._id === 'object' ? record._id.toString() : record._id;
        }
        delete record._id;
        delete record.__v;
        // Convert ObjectId references to strings
        for (const key of Object.keys(record)) {
          if (record[key] && typeof record[key] === 'object' && record[key].$oid) {
            record[key] = record[key].$oid;
          } else if (record[key] && typeof record[key] === 'object' && record[key].toString && key.endsWith('Id')) {
            record[key] = record[key].toString();
          }
        }

        const id = record.id;
        if (!id) continue;

        const existing = this.findById(id);
        if (existing) {
          this.update(id, { ...record, _dirty: 0 } as any);
        } else {
          const jsonFields = JSON_FIELDS[this.tableName] || [];
          const serialized: any = { ...record, _dirty: 0, _lastSyncedAt: new Date().toISOString() };
          for (const field of jsonFields) {
            if (serialized[field] !== undefined && typeof serialized[field] !== "string") {
              serialized[field] = JSON.stringify(serialized[field]);
            }
          }
          // Only use columns that exist in the table
          const keys = Object.keys(serialized).filter(k => validCols.includes(k));
          if (keys.length === 0) continue;

          const placeholders = keys.map(() => "?").join(", ");
          const values = keys.map((k) => serialized[k] ?? null);
          db.run(`INSERT OR REPLACE INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders})`, values);
        }
        count++;
      } catch (err: any) {
        // Skip records that fail (e.g., NOT NULL constraints from incomplete data)
        // This is non-fatal — the record just won't sync
        continue;
      }
    }
    saveToDisk();
    return count;
  }

  /** Get column names for this table */
  private getTableColumns(): string[] {
    const db = getDB();
    const results: string[] = [];
    const stmt = db.prepare(`PRAGMA table_info(${this.tableName})`);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      results.push(row.name);
    }
    stmt.free();
    return results;
  }

  private deserialize(row: any): T {
    const jsonFields = JSON_FIELDS[this.tableName] || [];
    const result = { ...row };
    for (const field of jsonFields) {
      if (result[field] && typeof result[field] === "string") {
        try { result[field] = JSON.parse(result[field]); } catch {}
      }
    }
    return result as T;
  }

  private logSync(operation: "create" | "update" | "delete", recordId: string, data: any): void {
    const db = getDB();
    db.run(
      `INSERT INTO _sync_log (id, tableName, operation, recordId, data, status, createdAt) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [uuid(), this.tableName, operation, recordId, JSON.stringify(data)]
    );
  }
}
