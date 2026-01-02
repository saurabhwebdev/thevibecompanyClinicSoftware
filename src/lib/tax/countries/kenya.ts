import { CountryTaxConfig } from "./index";

// Kenyan Counties
const KENYAN_COUNTIES = [
  { code: "001", name: "Mombasa" },
  { code: "002", name: "Kwale" },
  { code: "003", name: "Kilifi" },
  { code: "004", name: "Tana River" },
  { code: "005", name: "Lamu" },
  { code: "006", name: "Taita-Taveta" },
  { code: "007", name: "Garissa" },
  { code: "008", name: "Wajir" },
  { code: "009", name: "Mandera" },
  { code: "010", name: "Marsabit" },
  { code: "011", name: "Isiolo" },
  { code: "012", name: "Meru" },
  { code: "013", name: "Tharaka-Nithi" },
  { code: "014", name: "Embu" },
  { code: "015", name: "Kitui" },
  { code: "016", name: "Machakos" },
  { code: "017", name: "Makueni" },
  { code: "018", name: "Nyandarua" },
  { code: "019", name: "Nyeri" },
  { code: "020", name: "Kirinyaga" },
  { code: "021", name: "Murang'a" },
  { code: "022", name: "Kiambu" },
  { code: "023", name: "Turkana" },
  { code: "024", name: "West Pokot" },
  { code: "025", name: "Samburu" },
  { code: "026", name: "Trans-Nzoia" },
  { code: "027", name: "Uasin Gishu" },
  { code: "028", name: "Elgeyo-Marakwet" },
  { code: "029", name: "Nandi" },
  { code: "030", name: "Baringo" },
  { code: "031", name: "Laikipia" },
  { code: "032", name: "Nakuru" },
  { code: "033", name: "Narok" },
  { code: "034", name: "Kajiado" },
  { code: "035", name: "Kericho" },
  { code: "036", name: "Bomet" },
  { code: "037", name: "Kakamega" },
  { code: "038", name: "Vihiga" },
  { code: "039", name: "Bungoma" },
  { code: "040", name: "Busia" },
  { code: "041", name: "Siaya" },
  { code: "042", name: "Kisumu" },
  { code: "043", name: "Homa Bay" },
  { code: "044", name: "Migori" },
  { code: "045", name: "Kisii" },
  { code: "046", name: "Nyamira" },
  { code: "047", name: "Nairobi" },
];

export const kenyaConfig: CountryTaxConfig = {
  countryCode: "KE",
  countryName: "Kenya",
  currencyCode: "KES",
  currencySymbol: "KSh",
  taxName: "VAT",
  taxAuthority: "Kenya Revenue Authority (KRA)",
  taxAuthorityWebsite: "https://www.kra.go.ke",

  // KRA PIN Format: A000000000A (letter-9digits-letter)
  registrationNumberName: "KRA PIN",
  registrationNumberFormat: /^[A-Z][0-9]{9}[A-Z]$/,
  registrationNumberPlaceholder: "A000000000A",
  registrationNumberHelpText: "11-character KRA Personal Identification Number",

  defaultTaxRates: [
    { name: "Standard VAT", rate: 16, code: "SR", description: "Standard rate for most goods and services", isDefault: true, category: "standard" },
    { name: "Reduced Rate", rate: 8, code: "RR", description: "Petroleum products (except LPG)", isDefault: false, category: "reduced" },
    { name: "Zero-Rated", rate: 0, code: "ZR", description: "Exports, specified goods", isDefault: false, category: "zero" },
    { name: "Exempt", rate: 0, code: "EX", description: "Healthcare, education, financial services", isDefault: false, category: "exempt" },
  ],

  taxCodeName: "HS Code",
  defaultTaxCodes: [
    { code: "8610", description: "Hospital activities", rate: 0, category: "Healthcare" },
    { code: "8620", description: "Medical and dental practice", rate: 0, category: "Healthcare" },
    { code: "8690", description: "Other human health activities", rate: 0, category: "Healthcare" },
    { code: "8621", description: "General medical practice", rate: 0, category: "Healthcare" },
    { code: "8622", description: "Specialist medical practice", rate: 0, category: "Healthcare" },
    { code: "8623", description: "Dental practice", rate: 0, category: "Healthcare" },
    { code: "8691", description: "Ambulance services", rate: 0, category: "Healthcare" },
    { code: "8692", description: "Diagnostic laboratory services", rate: 0, category: "Healthcare" },
    { code: "8693", description: "Physiotherapy services", rate: 0, category: "Healthcare" },
  ],

  hasStates: true,
  states: KENYAN_COUNTIES,
  stateLabel: "County",

  businessTypes: [
    { value: "sole_proprietor", label: "Sole Proprietor" },
    { value: "partnership", label: "Partnership" },
    { value: "limited_company", label: "Limited Company" },
    { value: "branch", label: "Branch of Foreign Company" },
    { value: "ngo", label: "NGO/Non-Profit" },
    { value: "cooperative", label: "Cooperative Society" },
    { value: "public_company", label: "Public Limited Company" },
    { value: "other", label: "Other" },
  ],

  registrationTypes: [
    { value: "vat_registered", label: "VAT Registered (>KES 5M turnover)" },
    { value: "turnover_tax", label: "Turnover Tax (KES 1M - 25M)" },
    { value: "exempt", label: "VAT Exempt" },
    { value: "not_registered", label: "Not Registered" },
  ],

  customFields: [
    {
      name: "businessRegistration",
      label: "Business Registration Number",
      type: "text",
      required: false,
      placeholder: "PVT-XXXXXXX",
      section: "business",
      helpText: "Company registration number from Registrar",
    },
    {
      name: "etrSerialNumber",
      label: "ETR Serial Number",
      type: "text",
      required: false,
      placeholder: "Enter ETR serial number",
      section: "compliance",
      helpText: "Electronic Tax Register device serial number",
    },
    {
      name: "timsIntegrated",
      label: "TIMS Integrated",
      type: "switch",
      section: "compliance",
      helpText: "Integrated with Tax Invoice Management System",
    },
    {
      name: "ecitizenId",
      label: "eCitizen ID",
      type: "text",
      required: false,
      placeholder: "Enter eCitizen ID",
      section: "business",
      helpText: "eCitizen portal registration ID",
    },
    {
      name: "withholdingVat",
      label: "Withholding VAT Agent",
      type: "switch",
      section: "tax",
      helpText: "Appointed as withholding VAT agent",
    },
    {
      name: "preferentialRate",
      label: "Preferential Rate Eligible",
      type: "switch",
      section: "tax",
      helpText: "Eligible for preferential VAT treatment",
    },
  ],

  features: {
    eInvoicing: true, // TIMS (Tax Invoice Management System)
    eWayBill: false,
    reverseCharge: true,
    withholdingTax: true, // Withholding VAT
    digitalTaxRegister: true, // ETR mandatory
  },

  defaultFinancialYearStart: { month: 1, day: 1 }, // Calendar year (or July 1 for some)
};
