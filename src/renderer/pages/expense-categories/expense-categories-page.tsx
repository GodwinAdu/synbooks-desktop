import { useState } from "react";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

const defaultCategories: Category[] = [
  { id: "1", name: "Rent" },
  { id: "2", name: "Utilities" },
  { id: "3", name: "Office Supplies" },
  { id: "4", name: "Travel" },
  { id: "5", name: "Marketing" },
  { id: "6", name: "Insurance" },
  { id: "7", name: "Professional Fees" },
  { id: "8", name: "Miscellaneous" },
];

export function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    if (categories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    const newCategory: Category = {
      id: Date.now().toString(),
      name: newName.trim(),
    };
    setCategories([...categories, newCategory]);
    setNewName("");
    toast.success("Category added");
  };

  const handleDelete = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
    toast.success("Category removed");
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }
    setCategories(categories.map(c => c.id === editingId ? { ...c, name: editName.trim() } : c));
    setEditingId(null);
    setEditName("");
    toast.success("Category updated");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="p-6 space-y-6">
      <Heading title="Expense Categories" description="Organize expenses by category" />
      <Separator />

      <div className="max-w-2xl space-y-6">
        {/* Add Category */}
        <Card>
          <CardHeader>
            <CardTitle>Add Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Category name"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                className="flex-1"
              />
              <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Category List */}
        <Card>
          <CardHeader>
            <CardTitle>Categories ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {categories.map(category => (
                <div key={category.id} className="flex items-center justify-between py-3">
                  {editingId === category.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={saveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{category.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(category)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(category.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No categories yet. Add one above.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
