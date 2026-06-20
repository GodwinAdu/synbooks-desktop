import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const payrollRouter = Router();
const repo = new Repository<any>('payroll_runs');
const employeeRepo = new Repository<any>('employees');

payrollRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(repo.findPaginated({ where, orderBy: 'payDate', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

payrollRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
  res.json(item);
});

payrollRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const runNumber = data.runNumber || `PAY-${String(count + 1).padStart(4, '0')}`;
    
    // Map form field names to schema column names
    const item = repo.create({
      organizationId: req.organizationId,
      runNumber,
      payPeriod: data.payPeriod,
      payDate: data.payDate,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'draft',
      employeePayments: data.employees || data.employeePayments || [],
      totalGrossPay: data.totalGross ?? data.totalGrossPay ?? 0,
      totalDeductions: data.totalDeductions ?? 0,
      totalNetPay: data.totalNet ?? data.totalNetPay ?? 0,
      employeeCount: data.employees?.length ?? data.employeeCount ?? 0,
      notes: data.notes,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item, id: item.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

payrollRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

payrollRouter.post('/:id/process', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = repo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
    if (existing.status === 'completed') { res.status(400).json({ error: 'Payroll already processed' }); return; }

    // Parse employee payments
    let employeePayments: any[] = [];
    try { employeePayments = typeof existing.employeePayments === 'string' ? JSON.parse(existing.employeePayments || '[]') : (existing.employeePayments || []); } catch {}

    // Calculate totals from employee data
    let totalGross = 0;
    let totalSSNITEmployee = 0; // 5.5% from employee
    let totalSSNITEmployer = 0; // 13% from employer (13.5% total employer but 13% is SSNIT tier 1)
    let totalPAYE = 0;
    let totalNet = 0;
    let totalTier2 = 0; // 5% employer tier 2

    for (const emp of employeePayments) {
      const gross = emp.grossPay || emp.basicSalary || emp.salary || 0;
      const ssnitEmp = emp.ssnitEmployee || (gross * 0.055); // 5.5%
      const ssnitEr = emp.ssnitEmployer || (gross * 0.13); // 13%
      const tier2 = emp.tier2 || (gross * 0.05); // 5% employer
      const paye = emp.paye || emp.incomeTax || 0;
      const net = emp.netPay || (gross - ssnitEmp - paye);

      totalGross += gross;
      totalSSNITEmployee += ssnitEmp;
      totalSSNITEmployer += ssnitEr;
      totalTier2 += tier2;
      totalPAYE += paye;
      totalNet += net;
    }

    // Update payroll run status
    repo.update(req.params.id, {
      status: 'completed',
      processedBy: req.userId,
      processedAt: new Date().toISOString(),
      totalGrossPay: totalGross,
      totalDeductions: totalSSNITEmployee + totalPAYE,
      totalNetPay: totalNet,
      totalSSNITEmployee,
      totalSSNITEmployer,
      totalPAYE,
      modifiedBy: req.userId,
    });

    // ─── Post GL Entries ─────────────────────────────────────────────────────
    const { getOrCreateAccount } = require('../services/gl-posting');
    const { getDB, saveToDisk } = require('../../database');
    const { v4: uuid } = require('uuid');
    const db = getDB();
    const now = new Date().toISOString();
    const orgId = req.organizationId!;

    // Get or create accounts
    const salaryExpenseId = getOrCreateAccount(orgId, 'expense', 'Salary & Wages', req.userId || 'system');
    const ssnitEmployerExpId = getOrCreateAccount(orgId, 'expense', 'Employer SSNIT Contribution', req.userId || 'system');
    const ssnitPayableId = getOrCreateAccount(orgId, 'liability', 'SSNIT Payable', req.userId || 'system');
    const payePayableId = getOrCreateAccount(orgId, 'liability', 'PAYE Payable', req.userId || 'system');
    const netPayPayableId = getOrCreateAccount(orgId, 'liability', 'Net Salary Payable', req.userId || 'system');

    const glLines: any[] = [];

    // Debit: Salary Expense (gross pay)
    if (totalGross > 0) {
      glLines.push({ accountId: salaryExpenseId, description: `Payroll ${existing.runNumber} - Gross Salary`, debit: totalGross, credit: 0 });
    }

    // Debit: Employer SSNIT Contribution (13% + 5% tier 2 is employer cost)
    const employerContributions = totalSSNITEmployer + totalTier2;
    if (employerContributions > 0) {
      glLines.push({ accountId: ssnitEmployerExpId, description: `Payroll ${existing.runNumber} - Employer SSNIT/Tier2`, debit: employerContributions, credit: 0 });
    }

    // Credit: SSNIT Payable (employee 5.5% + employer 13% + tier 2 5%)
    const totalSSNIT = totalSSNITEmployee + totalSSNITEmployer + totalTier2;
    if (totalSSNIT > 0) {
      glLines.push({ accountId: ssnitPayableId, description: `Payroll ${existing.runNumber} - SSNIT Due`, debit: 0, credit: totalSSNIT });
    }

    // Credit: PAYE Payable (income tax withheld)
    if (totalPAYE > 0) {
      glLines.push({ accountId: payePayableId, description: `Payroll ${existing.runNumber} - PAYE Due`, debit: 0, credit: totalPAYE });
    }

    // Credit: Net Salary Payable (cash to be paid to employees)
    if (totalNet > 0) {
      glLines.push({ accountId: netPayPayableId, description: `Payroll ${existing.runNumber} - Net Pay`, debit: 0, credit: totalNet });
    }

    if (glLines.length > 0) {
      const totalDebit = glLines.reduce((s: number, l: any) => s + l.debit, 0);
      const totalCredit = glLines.reduce((s: number, l: any) => s + l.credit, 0);

      // Create journal entry
      const entryId = uuid();
      db.run(
        `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'payroll', ?, ?, ?, 0, ?, ?, 1)`,
        [entryId, orgId, `JE-PAY-${existing.runNumber}`, now, `Payroll: ${existing.runNumber} (${existing.payPeriod})`, JSON.stringify(glLines), totalDebit, totalCredit, existing.id, existing.runNumber, req.userId || 'system', now, now]
      );

      // Write GL entries
      const fiscalYear = new Date().getFullYear();
      const fiscalPeriod = new Date().getMonth() + 1;
      for (const line of glLines) {
        db.run(
          `INSERT INTO general_ledger (id, organizationId, accountId, journalEntryId, transactionDate, description, debit, credit, runningBalance, referenceType, referenceId, referenceNumber, fiscalYear, fiscalPeriod, del_flag, createdAt, updatedAt, _dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'payroll', ?, ?, ?, ?, 0, ?, ?, 1)`,
          [uuid(), orgId, line.accountId, entryId, now, line.description, line.debit, line.credit, existing.id, existing.runNumber, fiscalYear, fiscalPeriod, now, now]
        );
      }
      saveToDisk();
    }

    res.json({
      success: true,
      message: `Payroll processed. ${employeePayments.length} employees. GL entries posted.`,
      summary: { totalGross, totalSSNITEmployee, totalSSNITEmployer, totalPAYE, totalNet, employerContributions },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

payrollRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Payroll run deleted' });
});
