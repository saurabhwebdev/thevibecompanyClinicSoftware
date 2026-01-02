import { CountryTaxConfig } from "./index";

// UAE Emirates
const UAE_EMIRATES = [
  { code: "AUH", name: "Abu Dhabi" },
  { code: "DXB", name: "Dubai" },
  { code: "SHJ", name: "Sharjah" },
  { code: "AJM", name: "Ajman" },
  { code: "UAQ", name: "Umm Al Quwain" },
  { code: "RAK", name: "Ras Al Khaimah" },
  { code: "FUJ", name: "Fujairah" },
];

export const uaeConfig: CountryTaxConfig = {
  countryCode: "AE",
  countryName: "United Arab Emirates",
  currencyCode: "AED",
  currencySymbol: "د.إ",
  taxName: "VAT",
  taxAuthority: "Federal Tax Authority (FTA)",
  taxAuthorityWebsite: "https://tax.gov.ae",

  // TRN Format: 100XXXXXXXXX003
  registrationNumberName: "TRN",
  registrationNumberFormat: /^[0-9]{15}$/,
  registrationNumberPlaceholder: "100000000000003",
  registrationNumberHelpText: "15-digit Tax Registration Number",

  defaultTaxRates: [
    { name: "Standard VAT", rate: 5, code: "SR", description: "Standard rate for most goods and services", isDefault: true, category: "standard" },
    { name: "Zero-Rated", rate: 0, code: "ZR", description: "Zero-rated supplies (exports, international transport)", isDefault: false, category: "zero" },
    { name: "Exempt", rate: 0, code: "EX", description: "Exempt supplies (healthcare, education, financial services)", isDefault: false, category: "exempt" },
    { name: "Out of Scope", rate: 0, code: "OS", description: "Outside the scope of VAT", isDefault: false, category: "out-of-scope" },
  ],

  taxCodeName: "HS Code",
  defaultTaxCodes: [
    { code: "9931", description: "Hospital and medical services", rate: 0, category: "Healthcare" },
    { code: "9932", description: "Dental services", rate: 0, category: "Healthcare" },
    { code: "9933", description: "Paramedical services", rate: 0, category: "Healthcare" },
    { code: "9934", description: "Nursing services", rate: 0, category: "Healthcare" },
    { code: "9935", description: "Physiotherapy services", rate: 0, category: "Healthcare" },
    { code: "9936", description: "Ambulance services", rate: 0, category: "Healthcare" },
    { code: "9937", description: "Laboratory services", rate: 0, category: "Healthcare" },
    { code: "9939", description: "Other health services", rate: 0, category: "Healthcare" },
    { code: "9983", description: "Professional consulting services", rate: 5, category: "Professional" },
  ],

  hasStates: true,
  states: UAE_EMIRATES,
  stateLabel: "Emirate",

  businessTypes: [
    { value: "sole_establishment", label: "Sole Establishment" },
    { value: "llc", label: "Limited Liability Company (LLC)" },
    { value: "pjsc", label: "Public Joint Stock Company (PJSC)" },
    { value: "prjsc", label: "Private Joint Stock Company (PrJSC)" },
    { value: "branch", label: "Branch of Foreign Company" },
    { value: "freezone", label: "Free Zone Entity" },
    { value: "partnership", label: "Partnership" },
    { value: "other", label: "Other" },
  ],

  registrationTypes: [
    { value: "mandatory", label: "Mandatory Registration (>AED 375,000)" },
    { value: "voluntary", label: "Voluntary Registration (>AED 187,500)" },
    { value: "exempted", label: "Exempted" },
    { value: "not_registered", label: "Not Registered" },
  ],

  customFields: [
    {
      name: "tradeLicenseNumber",
      label: "Trade License Number",
      type: "text",
      required: true,
      placeholder: "Enter trade license number",
      section: "business",
      helpText: "Commercial license number issued by DED",
    },
    {
      name: "emirate",
      label: "Emirate of Registration",
      type: "select",
      required: true,
      section: "business",
      helpText: "Emirate where business is registered",
    },
    {
      name: "designatedZone",
      label: "Designated Zone",
      type: "switch",
      section: "tax",
      helpText: "Is the business located in a Designated Zone?",
    },
    {
      name: "taxGroup",
      label: "Tax Group Member",
      type: "switch",
      section: "tax",
      helpText: "Part of a VAT tax group",
    },
  ],

  features: {
    eInvoicing: false,
    eWayBill: false,
    reverseCharge: true,
    withholdingTax: false,
    digitalTaxRegister: false,
  },

  defaultFinancialYearStart: { month: 1, day: 1 }, // January 1 (Gregorian) or can be custom
};
