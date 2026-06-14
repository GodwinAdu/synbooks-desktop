/**
 * Quick Actions - Grid of common action buttons
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, DollarSign, BarChart3, Users, ShoppingCart, Building2, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "Create Invoice", icon: FileText, color: "text-blue-600", bg: "bg-blue-100", path: "/invoices" },
    { label: "Add Expense", icon: Receipt, color: "text-red-600", bg: "bg-red-100", path: "/expenses" },
    { label: "Run Payroll", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100", path: "/payroll" },
    { label: "View Reports", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-100", path: "/reports" },
    { label: "Add Customer", icon: Users, color: "text-cyan-600", bg: "bg-cyan-100", path: "/customers" },
    { label: "Add Product", icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-100", path: "/products" },
    { label: "Add Vendor", icon: Building2, color: "text-indigo-600", bg: "bg-indigo-100", path: "/vendors" },
    { label: "Tax Calculator", icon: Calculator, color: "text-pink-600", bg: "bg-pink-100", path: "/reports" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="w-full h-auto flex-col gap-2 py-4"
              onClick={() => navigate(action.path)}
            >
              <div className={`rounded-full p-2 ${action.bg}`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
