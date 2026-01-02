import { CountryTaxConfig } from "./index";

// Philippine Regions
const PHILIPPINE_REGIONS = [
  { code: "NCR", name: "National Capital Region (Metro Manila)" },
  { code: "CAR", name: "Cordillera Administrative Region" },
  { code: "I", name: "Ilocos Region" },
  { code: "II", name: "Cagayan Valley" },
  { code: "III", name: "Central Luzon" },
  { code: "IVA", name: "CALABARZON" },
  { code: "IVB", name: "MIMAROPA" },
  { code: "V", name: "Bicol Region" },
  { code: "VI", name: "Western Visayas" },
  { code: "VII", name: "Central Visayas" },
  { code: "VIII", name: "Eastern Visayas" },
  { code: "IX", name: "Zamboanga Peninsula" },
  { code: "X", name: "Northern Mindanao" },
  { code: "XI", name: "Davao Region" },
  { code: "XII", name: "SOCCSKSARGEN" },
  { code: "XIII", name: "Caraga" },
  { code: "BARMM", name: "Bangsamoro" },
];

export const philippinesConfig: CountryTaxConfig = {
  countryCode: "PH",
  countryName: "Philippines",
  currencyCode: "PHP",
  currencySymbol: "₱",
  taxName: "VAT",
  taxAuthority: "Bureau of Internal Revenue (BIR)",
  taxAuthorityWebsite: "https://www.bir.gov.ph",

  // TIN Format: 000-000-000-000 or 000-000-000-00000
  registrationNumberName: "TIN",
  registrationNumberFormat: /^[0-9]{3}-[0-9]{3}-[0-9]{3}(-[0-9]{3,5})?$/,
  registrationNumberPlaceholder: "000-000-000-000",
  registrationNumberHelpText: "Tax Identification Number issued by BIR",

  defaultTaxRates: [
    { name: "Standard VAT", rate: 12, code: "VAT", description: "Standard VAT rate on goods and services", isDefault: true, category: "standard" },
    { name: "Zero-Rated", rate: 0, code: "ZR", description: "Zero-rated (exports, services to non-residents)", isDefault: false, category: "zero" },
    { name: "VAT Exempt", rate: 0, code: "EX", description: "Exempt (healthcare, education, agricultural)", isDefault: false, category: "exempt" },
    { name: "Non-VAT", rate: 3, code: "NV", description: "Percentage tax for non-VAT registered", isDefault: false, category: "percentage" },
  ],

  taxCodeName: "PSIC Code",
  defaultTaxCodes: [
    { code: "8610", description: "Hospital activities", rate: 0, category: "Healthcare" },
    { code: "8620", description: "Medical and dental practice activities", rate: 0, category: "Healthcare" },
    { code: "8690", description: "Other human health activities", rate: 0, category: "Healthcare" },
    { code: "8710", description: "Residential nursing care facilities", rate: 0, category: "Healthcare" },
    { code: "8621", description: "General medical practice", rate: 0, category: "Healthcare" },
    { code: "8622", description: "Specialist medical practice", rate: 0, category: "Healthcare" },
    { code: "8623", description: "Dental practice", rate: 0, category: "Healthcare" },
    { code: "8691", description: "Ambulance activities", rate: 0, category: "Healthcare" },
    { code: "8692", description: "Medical laboratory activities", rate: 12, category: "Professional" },
  ],

  hasStates: true,
  states: PHILIPPINE_REGIONS,
  stateLabel: "Region",

  businessTypes: [
    { value: "sole_proprietorship", label: "Sole Proprietorship" },
    { value: "partnership", label: "Partnership" },
    { value: "corporation", label: "Corporation" },
    { value: "cooperative", label: "Cooperative" },
    { value: "branch", label: "Branch Office" },
    { value: "representative", label: "Representative Office" },
    { value: "one_person_corp", label: "One Person Corporation" },
    { value: "other", label: "Other" },
  ],

  registrationTypes: [
    { value: "vat_registered", label: "VAT Registered (>₱3M annual sales)" },
    { value: "non_vat", label: "Non-VAT (≤₱3M annual sales)" },
    { value: "exempt", label: "VAT Exempt" },
    { value: "mixed", label: "Mixed Transactions" },
  ],

  customFields: [
    {
      name: "secRegistration",
      label: "SEC Registration Number",
      type: "text",
      required: false,
      placeholder: "Enter SEC registration number",
      section: "business",
      helpText: "Securities and Exchange Commission registration",
    },
    {
      name: "rdoCode",
      label: "RDO Code",
      type: "text",
      required: true,
      placeholder: "000",
      section: "business",
      maxLength: 3,
      helpText: "Revenue District Office code",
    },
    {
      name: "birCertificateDate",
      label: "BIR Certificate of Registration Date",
      type: "text",
      required: false,
      placeholder: "MM/DD/YYYY",
      section: "business",
      helpText: "Date of BIR registration",
    },
    {
      name: "withholdingAgent",
      label: "Withholding Agent",
      type: "switch",
      section: "tax",
      helpText: "Registered as withholding tax agent",
    },
    {
      name: "expandedWithholding",
      label: "Expanded Withholding Tax",
      type: "switch",
      section: "tax",
      helpText: "Subject to expanded withholding tax",
    },
    {
      name: "orSeriesStart",
      label: "Official Receipt Series Start",
      type: "text",
      required: false,
      placeholder: "0000001",
      section: "invoice",
      helpText: "Starting number for Official Receipts",
    },
  ],

  features: {
    eInvoicing: true, // Electronic invoicing/receipting (CAS)
    eWayBill: false,
    reverseCharge: false,
    withholdingTax: true,
    digitalTaxRegister: true, // Computerized Accounting System (CAS)
  },

  defaultFinancialYearStart: { month: 1, day: 1 }, // Calendar year
};
