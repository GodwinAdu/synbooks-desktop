export interface POSProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  sellingPrice: number;
  costPrice?: number;
  taxRate?: number;
  taxable?: boolean;
  currentStock: number;
  trackInventory: boolean;
  primaryImage?: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  type?: string;
  hasVariants?: boolean;
  variants?: POSVariant[];
  priceTiers?: PriceTier[];
}

export interface POSVariant {
  name: string;
  sku: string;
  sellingPrice: number;
  stock: number;
  attributes?: Record<string, string>;
  image?: string;
  priceTiers?: PriceTier[];
}

export interface PriceTier {
  name: string;
  minQty: number;
  price: number;
}

export interface CartItem {
  productId: string;
  variantSku?: string;
  variantName?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage per item
  taxRate: number;
  taxAmount: number;
  total: number;
  appliedTier?: string;
}

export interface SplitPayment {
  method: string;
  amount: number;
}

export interface POSSale {
  id: string;
  saleNumber: string;
  customerName?: string;
  lineItems: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  splitPayments?: SplitPayment[];
  amountTendered?: number;
  changeDue?: number;
  notes?: string;
  status: string;
  createdAt: string;
}

export interface POSSession {
  cashierName: string;
  openingFloat: number;
  startTime: string;
  salesCount: number;
  totalSales: number;
  isActive: boolean;
}
