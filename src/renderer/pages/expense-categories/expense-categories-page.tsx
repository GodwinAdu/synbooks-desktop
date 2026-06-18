/**
 * Expense Categories Page
 * CRUD using dedicated expense_categories table (syncs with cloud).
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description?: string;
}

export function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.get("/categories/expense");
      setCategories(Array.isArray(res) ? res : res.data || []);
    } catch { setCategories([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Enter a category name"); return; }
    try {
      await api.post("/categories/expense", { name: newName.trim() });
      setNewName("");
      toast.success("Category added");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add category");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      await api.delete(`/categories/expense/${id}`);
      toast.success("Category deleted");
      load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditName(cat.name); };

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    try {
      await api.put(`/categories/expense/${editingId}`, { name: editName.trim() });
      setEditingId(null);
      toast.success("Category updated");
      load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="p-6 space-y-6">
      <Heading title="Expense Categories" description="Organize expenses by category" />
      <Separator />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-orange-600" /> Add Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New category name..." onKeyDown={e => e.key === "Enter" && handleAdd()} className="flex-1" />
              <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Categories ({categories.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="divide-y">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="flex items-center justify-between py-3">
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }} className="h-8 flex-1" autoFocus />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal">{idx + 1}</Badge>
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {categories.length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No categories yet. Add one above.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
