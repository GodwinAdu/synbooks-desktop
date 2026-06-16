/**
 * Project Financials Tab
 * Full invoice, expense, and payment management linked to a project.
 * Matches the Next.js app's project invoices/expenses tabs.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { DollarSign, TrendingUp, TrendingDown, FileText, Receipt, Plus, Trash2, Banknote } from "lucide-react";

interface ProjectFinancialsProps {
  projectId: string;
  projectName?: string;
}

export function ProjectFinancials({ projectId, projectName }: ProjectFinancialsProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<any>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get("/invoices", { projectId, pageSize: 100 }).catch(() => ({ data: [] })),
      api.get("/expenses", { projectId, pageSize: 100 }).catch(() => ({ data: [] })),
      api.get("/customers", { pageSize: 200 }).catch(() => ({ data: [] })),
      api.get("/vendors", { pageSize: 200 }).catch(() => ({ data: [] })),
    ]).then(([inv, exp, cust, vend]: any[]) => {
      setInvoices(inv.data || []);
      setExpenses(exp.data || []);
      setCustomers(cust.data || []);
      setVendors(vend.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paidAmount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const profitLoss = totalInvoiced - totalExpenses;

  if (loading) return <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={FileText} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Collected" value={formatCurrency(totalPaid)} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} icon={Receipt} color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="Profit/Loss" value={formatCurrency(profitLoss)} icon={profitLoss >= 0 ? TrendingUp : TrendingDown} color={profitLoss >= 0 ? "text-emerald-600" : "text-red-600"} bg={profitLoss >= 0 ? "bg-emerald-50" : "bg-red-50"} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowInvoice(true)}><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
        <Button size="sm" variant="outline" onClick={() => setShowExpense(true)}><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300" onClick={() => setShowPayment(true)}><Banknote className="h-4 w-4 mr-1" /> Record Payment Received</Button>
      </div>

      <Separator />

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Invoices ({invoices.length})</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p> : (
            <div className="space-y-2">
              {invoices.map((inv: any) => {
                const outstanding = (inv.totalAmount || 0) - (inv.paidAmount || 0);
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <Badge className={`text-[10px] ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : inv.status === "sent" ? "bg-blue-100 text-blue-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>{inv.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} • Due: {new Date(inv.dueDate).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatCurrency(inv.totalAmount)}</p>
                        {inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount && <p className="text-[10px] text-muted-foreground">Paid: {formatCurrency(inv.paidAmount)}</p>}
                      </div>
                      {outstanding > 0.01 && (
                        <Button size="sm" variant="outline" className="text-xs text-emerald-600 border-emerald-300" onClick={() => setPayingInvoice(inv)}>Pay</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4 text-orange-600" /> Expenses ({expenses.length})</CardTitle></CardHeader>
        <CardContent>
          {expenses.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No expenses yet</p> : (
            <div className="space-y-2">
              {expenses.map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{exp.expenseNumber}</p>
                    <p className="text-xs text-muted-foreground">{exp.description || new Date(exp.date).toLocaleDateString("en-GH", { day: "numeric", month: "short" })} • <span className="capitalize">{exp.paymentMethod?.replace("_", " ") || "cash"}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatCurrency(exp.amount)}</span>
                    <Badge className={`text-[10px] ${exp.status === "approved" ? "bg-emerald-100 text-emerald-700" : exp.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>{exp.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showInvoice && <InvoiceDialog open={showInvoice} onClose={() => setShowInvoice(false)} projectId={projectId} projectName={projectName} customers={customers} onCreated={fetchData} />}
      {showExpense && <ExpenseDialog open={showExpense} onClose={() => setShowExpense(false)} projectId={projectId} vendors={vendors} onCreated={fetchData} />}
      {showPayment && <PaymentReceivedDialog open={showPayment} onClose={() => setShowPayment(false)} projectId={projectId} customers={customers} onCreated={fetchData} />}
      {payingInvoice && <RecordPaymentDialog invoice={payingInvoice} onClose={() => setPayingInvoice(null)} onCreated={fetchData} />}
    </div>
  );
}

// ─── Invoice Dialog (with customer, line items, status) ─────────────────────
function InvoiceDialog({ open, onClose, projectId, projectName, customers, onCreated }: any) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: "", status: "draft", invoiceDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), notes: "" });
  const [lines, setLines] = useState([{ description: projectName || "", quantity: 1, rate: 0, taxRate: 0 }]);

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const taxAmount = lines.reduce((s, l) => s + (l.quantity * l.rate * l.taxRate) / 100, 0);
  const total = subtotal + taxAmount;

  const updateLine = (i: number, field: string, value: any) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lines.some((l) => l.description.trim() && l.rate > 0)) { toast.error("Add at least one line item with amount"); return; }
    setSaving(true);
    try {
      await api.post("/invoices", {
        customerId: form.customerId || null,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        status: form.status,
        projectId,
        notes: form.notes,
        lineItems: lines.filter((l) => l.description.trim()).map((l) => ({ name: l.description, quantity: l.quantity, unitPrice: l.rate, total: l.quantity * l.rate, taxRate: l.taxRate, taxAmount: (l.quantity * l.rate * l.taxRate) / 100 })),
        subtotal, taxAmount, totalAmount: total,
      });
      toast.success("Invoice created"); onCreated(); onClose();
    } catch (err: any) { toast.error(err.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Project Invoice</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={form.customerId || "none"} onValueChange={(v) => setForm({ ...form, customerId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer</SelectItem>
                  {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Send Now</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Invoice Date *</Label><Input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Due Date *</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required /></div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, { description: "", quantity: 1, rate: 0, taxRate: 0 }])}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-5" placeholder="Description" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                  <Input className="col-span-2" type="number" min="0" step="1" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value) || 1)} />
                  <Input className="col-span-2" type="number" min="0" step="0.01" placeholder="Rate" value={line.rate || ""} onChange={(e) => updateLine(i, "rate", Number(e.target.value) || 0)} />
                  <Input className="col-span-2" type="number" min="0" max="100" step="0.5" placeholder="Tax%" value={line.taxRate || ""} onChange={(e) => updateLine(i, "taxRate", Number(e.target.value) || 0)} />
                  <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-red-500" onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))} disabled={lines.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
            <div className="text-right text-sm mt-2 space-y-0.5">
              <p className="text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</p>
              {taxAmount > 0 && <p className="text-muted-foreground">Tax: {formatCurrency(taxAmount)}</p>}
              <p className="font-bold">Total: {formatCurrency(total)}</p>
            </div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Invoice"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Expense Dialog (with vendor, category, payment method, status) ─────────
function ExpenseDialog({ open, onClose, projectId, vendors, onCreated }: any) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vendorId: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10), paymentMethod: "cash", status: "approved" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    setSaving(true);
    try {
      await api.post("/expenses", {
        vendorId: form.vendorId || null,
        amount: parseFloat(form.amount),
        description: form.description,
        date: form.date,
        paymentMethod: form.paymentMethod,
        status: form.status,
        projectId,
      });
      toast.success("Expense added"); onCreated(); onClose();
    } catch (err: any) { toast.error(err.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Project Expense</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={form.vendorId || "none"} onValueChange={(v) => setForm({ ...form, vendorId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vendor</SelectItem>
                  {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (GHS) *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What was this expense for?" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Expense"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Payment Received (direct, no invoice) ───────────────────────────
function PaymentReceivedDialog({ open, onClose, projectId, customers, onCreated }: any) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: "", description: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "bank_transfer", notes: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) { toast.error("Description and amount required"); return; }
    setSaving(true);
    try {
      await api.post("/payments", {
        customerId: form.customerId || null,
        amount: parseFloat(form.amount),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        paymentType: "received",
        projectId,
        notes: `${form.description}${form.notes ? " — " + form.notes : ""}`,
      });
      toast.success("Payment received recorded"); onCreated(); onClose();
    } catch (err: any) { toast.error(err.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment Received</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Customer paid without an invoice. Records directly as revenue.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={form.customerId || "none"} onValueChange={(v) => setForm({ ...form, customerId: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select customer (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No customer</SelectItem>
                {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Description *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Deposit for website project" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Amount (GHS) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required /></div>
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "Recording..." : "Record Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Payment against Invoice ─────────────────────────────────────────
function RecordPaymentDialog({ invoice, onClose, onCreated }: { invoice: any; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const outstanding = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  const [form, setForm] = useState({ amount: outstanding.toFixed(2), paymentMethod: "bank_transfer", paymentDate: new Date().toISOString().slice(0, 10), reference: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > outstanding + 0.01) { toast.error(`Amount exceeds outstanding (${formatCurrency(outstanding)})`); return; }
    setSaving(true);
    try {
      await api.post(`/invoices/${invoice.id}/record-payment`, {
        amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        referenceNumber: form.reference,
      });
      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      onCreated(); onClose();
    } catch (err: any) { toast.error(err.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Record Payment — {invoice.invoiceNumber}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
            {invoice.paidAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-emerald-600">{formatCurrency(invoice.paidAmount)}</span></div>}
            <div className="flex justify-between font-semibold border-t pt-1"><span>Outstanding</span><span className="text-orange-600">{formatCurrency(outstanding)}</span></div>
          </div>
          <div className="space-y-2"><Label>Amount (GHS) *</Label><Input type="number" step="0.01" max={outstanding} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
          <div className="space-y-2"><Label>Reference / Transaction ID</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. TXN-12345" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "Recording..." : "Record Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <Card className="border-0 ring-1 ring-border/50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`h-4 w-4 ${color}`} /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase">{label}</p><p className="text-base font-bold leading-tight">{value}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
