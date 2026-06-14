export interface OrganizationSettings {
  id?: string;
  name: string;
  organizationCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  registrationNumber?: string;
  industry?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  settings?: {
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    fiscalYearStart?: string;
    invoicePrefix?: string;
    invoiceNextNumber?: number;
    estimatePrefix?: string;
    expensePrefix?: string;
    billPrefix?: string;
    defaultPaymentTerms?: string;
    defaultTaxRate?: number;
    posReceiptHeader?: string;
    posReceiptFooter?: string;
  };
}

export const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Northern", "Volta", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti",
  "Western North",
] as const;

export const CURRENCIES = [
  { code: "GHS", name: "Ghana Cedi", symbol: "₵" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
] as const;

export const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net7", label: "Net 7" },
  { value: "net15", label: "Net 15" },
  { value: "net30", label: "Net 30" },
  { value: "net45", label: "Net 45" },
  { value: "net60", label: "Net 60" },
  { value: "net90", label: "Net 90" },
] as const;

export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-12-31)" },
] as const;
