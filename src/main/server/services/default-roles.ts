/**
 * Default Roles & Permissions
 * 
 * Defines the default role templates with their permission sets.
 * Called during first-time setup or when roles need to be reset.
 * Matches the Next.js cloud app's role/permission model.
 */

import { Repository } from '../../database/repository';

// All available permission keys in the system
export const ALL_PERMISSIONS = [
  'dashboard_view',
  'invoices_create', 'invoices_view', 'invoices_update', 'invoices_delete',
  'customers_create', 'customers_view', 'customers_update', 'customers_delete',
  'expenses_create', 'expenses_view', 'expenses_update', 'expenses_delete',
  'bills_create', 'bills_view', 'bills_update', 'bills_delete',
  'vendors_create', 'vendors_view', 'vendors_update', 'vendors_delete',
  'products_create', 'products_view', 'products_update', 'products_delete',
  'employees_create', 'employees_view', 'employees_update', 'employees_delete',
  'payroll_create', 'payroll_view', 'payroll_update', 'payroll_delete',
  'accounts_create', 'accounts_view', 'accounts_update', 'accounts_delete',
  'journalEntries_create', 'journalEntries_view', 'journalEntries_update', 'journalEntries_delete',
  'generalLedger_view',
  'reports_view',
  'projects_create', 'projects_view', 'projects_update', 'projects_delete',
  'budgets_create', 'budgets_view', 'budgets_update', 'budgets_delete',
  'assets_create', 'assets_view', 'assets_update', 'assets_delete',
  'crm_create', 'crm_view', 'crm_update', 'crm_delete',
  'pos_sell', 'pos_view', 'pos_void',
  'production_create', 'production_view', 'production_update', 'production_delete',
  'procurement_create', 'procurement_view', 'procurement_update', 'procurement_delete',
  'contracts_create', 'contracts_view', 'contracts_update', 'contracts_delete',
  'settings_view', 'settings_update',
  'userManagement_create', 'userManagement_view', 'userManagement_update', 'userManagement_delete',
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number];
export type PermissionsMap = Record<string, boolean>;

/** Build a permissions object with all keys set to a specific value */
function allPermissions(value: boolean): PermissionsMap {
  const map: PermissionsMap = {};
  for (const key of ALL_PERMISSIONS) {
    map[key] = value;
  }
  return map;
}

/** Build a permissions object from a list of allowed keys */
function permissionsFrom(keys: string[]): PermissionsMap {
  const map: PermissionsMap = {};
  for (const key of ALL_PERMISSIONS) {
    map[key] = keys.includes(key);
  }
  return map;
}

/** Only view permissions (any key ending with _view) */
function viewOnlyPermissions(): PermissionsMap {
  const map: PermissionsMap = {};
  for (const key of ALL_PERMISSIONS) {
    map[key] = key.endsWith('_view');
  }
  return map;
}

export interface DefaultRole {
  name: string;
  displayName: string;
  description: string;
  permissions: PermissionsMap;
  isSystem: boolean;
}

export const DEFAULT_ROLES: DefaultRole[] = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full access to all features and settings',
    permissions: allPermissions(true),
    isSystem: true,
  },
  {
    name: 'accountant',
    displayName: 'Accountant',
    description: 'Accounting, reports, banking, journal entries, GL, expenses, bills, invoices, period close',
    permissions: permissionsFrom([
      'dashboard_view',
      'invoices_create', 'invoices_view', 'invoices_update', 'invoices_delete',
      'customers_view',
      'expenses_create', 'expenses_view', 'expenses_update', 'expenses_delete',
      'bills_create', 'bills_view', 'bills_update', 'bills_delete',
      'vendors_view',
      'products_view',
      'accounts_create', 'accounts_view', 'accounts_update', 'accounts_delete',
      'journalEntries_create', 'journalEntries_view', 'journalEntries_update', 'journalEntries_delete',
      'generalLedger_view',
      'reports_view',
      'budgets_view',
      'assets_create', 'assets_view', 'assets_update', 'assets_delete',
      'settings_view',
    ]),
    isSystem: true,
  },
  {
    name: 'sales',
    displayName: 'Sales',
    description: 'Invoices, customers, estimates, payments, credit notes, products (view), POS',
    permissions: permissionsFrom([
      'dashboard_view',
      'invoices_create', 'invoices_view', 'invoices_update', 'invoices_delete',
      'customers_create', 'customers_view', 'customers_update', 'customers_delete',
      'products_view',
      'pos_sell', 'pos_view', 'pos_void',
      'crm_create', 'crm_view', 'crm_update', 'crm_delete',
      'contracts_create', 'contracts_view', 'contracts_update', 'contracts_delete',
      'reports_view',
    ]),
    isSystem: true,
  },
  {
    name: 'inventory',
    displayName: 'Inventory Manager',
    description: 'Products (full), stock adjustments, reorder alerts, purchase orders',
    permissions: permissionsFrom([
      'dashboard_view',
      'products_create', 'products_view', 'products_update', 'products_delete',
      'procurement_create', 'procurement_view', 'procurement_update', 'procurement_delete',
      'vendors_view',
      'production_create', 'production_view', 'production_update', 'production_delete',
      'reports_view',
    ]),
    isSystem: true,
  },
  {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to all modules',
    permissions: viewOnlyPermissions(),
    isSystem: true,
  },
];

interface RoleRecord {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  description: string;
  permissions: PermissionsMap;
  isSystem: number;
  del_flag: number;
}

/**
 * Ensure default roles exist for an organization.
 * Creates them if they don't already exist.
 */
export function ensureDefaultRoles(organizationId: string): void {
  const roleRepo = new Repository<RoleRecord>('roles');

  for (const role of DEFAULT_ROLES) {
    const existing = roleRepo.findOne({
      organizationId,
      name: role.name,
      del_flag: 0,
    });

    if (!existing) {
      roleRepo.create({
        organizationId,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions as any,
        isSystem: role.isSystem ? 1 : 0,
        del_flag: 0,
      } as any);
    }
  }
}
