// Country Tax Configuration System
// Add new countries by creating a new file in this directory and adding to the exports

export interface TaxRate {
  name: string;
  rate: number;
  code?: string;
  description: string;
  isDefault?: boolean;
  category?: string;
}

export interface TaxCode {
  code: string;
  description: string;
  rate: number;
  category: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: "text" | "select" | "number" | "switch" | "textarea";
  required?: boolean;
  placeholder?: string;
  pattern?: RegExp;
  patternMessage?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
  section: "business" | "address" | "tax" | "invoice" | "compliance" | "additional";
  uppercase?: boolean;
  maxLength?: number;
}

// Payment Gateway definition
export interface PaymentGateway {
  id: string;
  name: string;
  description: string;
  logo?: string;
  website: string;
  features: string[];
  supportedCurrencies: string[];
  settingsFields: PaymentSettingsField[];
}

export interface PaymentSettingsField {
  name: string;
  label: string;
  type: "text" | "password" | "switch" | "select";
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

// Local Payment Method (non-gateway based)
export interface LocalPaymentMethod {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  requiresTransactionId?: boolean;
  transactionIdLabel?: string;
  transactionIdPlaceholder?: string;
}

// Payment Configuration for a country
export interface PaymentConfig {
  defaultCurrency: string;
  gateways: PaymentGateway[];
  localMethods: LocalPaymentMethod[];
  // Which methods are shown in POS/Billing
  posPaymentMethods: string[]; // IDs of local methods to show
}

export interface StateDefinition {
  code: string;
  name: string;
}

export interface CountryTaxConfig {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  taxName: string; // GST, VAT, etc.
  taxAuthority: string;
  taxAuthorityWebsite?: string;

  // Registration
  registrationNumberName: string; // GSTIN, TRN, TIN, KRA PIN
  registrationNumberFormat: RegExp;
  registrationNumberPlaceholder: string;
  registrationNumberHelpText: string;

  // Tax Rates
  defaultTaxRates: TaxRate[];

  // Service/Product Codes
  taxCodeName: string; // SAC, HS Code, etc.
  defaultTaxCodes: TaxCode[];

  // States/Regions (if applicable)
  hasStates: boolean;
  states?: StateDefinition[];
  stateLabel?: string; // State, Emirate, Province, County

  // Business types
  businessTypes: { value: string; label: string }[];

  // Registration types
  registrationTypes: { value: string; label: string }[];

  // Custom fields for this country
  customFields: FieldDefinition[];

  // Features
  features: {
    eInvoicing: boolean;
    eInvoicingThreshold?: number;
    eWayBill: boolean;
    eWayBillThreshold?: number;
    reverseCharge: boolean;
    withholdingTax: boolean;
    digitalTaxRegister: boolean;
  };

  // Financial year
  defaultFinancialYearStart: { month: number; day: number };

  // Payment Configuration
  paymentConfig: PaymentConfig;
}

// Export all country configs
export { indiaConfig } from "./india";
export { uaeConfig } from "./uae";
export { philippinesConfig } from "./philippines";
export { kenyaConfig } from "./kenya";

// Import and create registry
import { indiaConfig } from "./india";
import { uaeConfig } from "./uae";
import { philippinesConfig } from "./philippines";
import { kenyaConfig } from "./kenya";

export const TAX_COUNTRIES: Record<string, CountryTaxConfig> = {
  IN: indiaConfig,
  AE: uaeConfig,
  PH: philippinesConfig,
  KE: kenyaConfig,
};

export const SUPPORTED_COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
];

export const getCountryConfig = (countryCode: string): CountryTaxConfig | undefined => {
  return TAX_COUNTRIES[countryCode];
};
