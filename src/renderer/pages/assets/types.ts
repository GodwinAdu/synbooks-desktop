export interface FixedAsset {
  id: string;
  name: string;
  assetNumber?: string;
  category: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  depreciationMethod: "straight_line" | "reducing_balance" | "units_of_production";
  usefulLifeYears: number;
  salvageValue: number;
  accumulatedDepreciation: number;
  status: "active" | "disposed" | "fully_depreciated";
  location?: string;
  description?: string;
  createdAt: string;
}

export const ASSET_CATEGORIES = [
  "Land & Buildings",
  "Plant & Machinery",
  "Motor Vehicles",
  "Office Equipment",
  "Computer Equipment",
  "Furniture & Fittings",
  "Leasehold Improvements",
  "Other",
] as const;

export const DEPRECIATION_METHODS = [
  { value: "straight_line", label: "Straight Line" },
  { value: "reducing_balance", label: "Reducing Balance" },
  { value: "units_of_production", label: "Units of Production" },
] as const;
