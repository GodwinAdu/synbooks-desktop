/**
 * Customer Type-ahead Search
 * Searches local customers by name, phone, or email.
 * Shows dropdown results as user types. Selecting sets the customer.
 */

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CustomerSearchProps {
  value: string;
  onChange: (name: string) => void;
}

export function CustomerSearch({ value, onChange }: CustomerSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all customers once
  useEffect(() => {
    api.get("/customers", { pageSize: 500 })
      .then((res: any) => setAllCustomers(res.data || []))
      .catch(() => {});
  }, []);

  // Search as user types
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = allCustomers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    ).slice(0, 8);
    setResults(matches);
  }, [query, allCustomers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setQuery(customer.name);
    onChange(customer.name);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange(val);
    setSelectedCustomer(null);
    if (val.length >= 2) setShowDropdown(true);
    else setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search customer (name, phone, email)..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (query.length >= 2 && results.length > 0) setShowDropdown(true); }}
            className="h-8 text-xs pl-7 pr-7"
          />
          {selectedCustomer && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Selected customer info */}
      {selectedCustomer && (
        <div className="mt-1 px-2 py-1 rounded bg-primary/5 border border-primary/20 text-[10px]">
          <span className="font-medium text-primary">{selectedCustomer.name}</span>
          {selectedCustomer.phone && <span className="text-muted-foreground ml-2">{selectedCustomer.phone}</span>}
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {results.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors border-b last:border-0"
            >
              <User className="h-3 w-3 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{customer.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {[customer.phone, customer.email].filter(Boolean).join(" • ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg p-3">
          <p className="text-xs text-muted-foreground text-center">No customers found for "{query}"</p>
          <p className="text-[10px] text-muted-foreground text-center mt-0.5">Name will be used as-is</p>
        </div>
      )}
    </div>
  );
}
