import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGSTRate {
  name: string;
  rate: number;
  sacCode: string;
  description?: string;
  isDefault?: boolean;
}

export interface IGSTConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  // Business Details
  gstin: string;
  legalName: string;
  tradeName?: string;
  businessType: "proprietorship" | "partnership" | "company" | "llp" | "trust" | "other";
  pan: string;
  // Registered Address
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    country: string;
  };
  // Contact Details
  email: string;
  phone: string;
  // GST Settings
  gstRegistrationType: "regular" | "composition" | "unregistered" | "consumer" | "overseas" | "sez";
  defaultPlaceOfSupply: string;
  reverseChargeApplicable: boolean;
  // Tax Rates
  gstRates: IGSTRate[];
  defaultGSTRate: number;
  // Invoice Settings
  invoiceSettings: {
    prefix: string;
    startingNumber: number;
    currentNumber: number;
    showQRCode: boolean;
    showLogo: boolean;
    termsAndConditions?: string;
    notes?: string;
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      branchName?: string;
      accountType: "savings" | "current";
    };
  };
  // E-Invoice Settings
  eInvoiceSettings: {
    enabled: boolean;
    apiUsername?: string;
    apiPassword?: string;
    sandbox: boolean;
  };
  // E-Way Bill Settings
  eWayBillSettings: {
    enabled: boolean;
    autoGenerate: boolean;
    thresholdAmount: number;
  };
  // HSN/SAC Codes for medical services
  sacCodes: Array<{
    code: string;
    description: string;
    gstRate: number;
    category: string;
  }>;
  // Additional Settings
  financialYear: {
    startMonth: number; // 1-12
    startDay: number;
  };
  tdsApplicable: boolean;
  tcsApplicable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GSTRateSchema = new Schema<IGSTRate>(
  {
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    sacCode: { type: String, required: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const SACCodeSchema = new Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    gstRate: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const GSTConfigSchema: Schema<IGSTConfig> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
    },
    // Business Details
    gstin: {
      type: String,
      required: [true, "GSTIN is required"],
      uppercase: true,
      trim: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"],
    },
    legalName: {
      type: String,
      required: [true, "Legal name is required"],
      trim: true,
    },
    tradeName: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      enum: ["proprietorship", "partnership", "company", "llp", "trust", "other"],
      default: "proprietorship",
    },
    pan: {
      type: String,
      required: [true, "PAN is required"],
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
    },
    // Address
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      stateCode: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
    },
    // Contact
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    // GST Settings
    gstRegistrationType: {
      type: String,
      enum: ["regular", "composition", "unregistered", "consumer", "overseas", "sez"],
      default: "regular",
    },
    defaultPlaceOfSupply: {
      type: String,
      required: true,
    },
    reverseChargeApplicable: {
      type: Boolean,
      default: false,
    },
    // Tax Rates
    gstRates: {
      type: [GSTRateSchema],
      default: [
        { name: "Exempt", rate: 0, sacCode: "9993", description: "Healthcare services", isDefault: false },
        { name: "GST 5%", rate: 5, sacCode: "9993", description: "Medical equipment rental", isDefault: false },
        { name: "GST 12%", rate: 12, sacCode: "9993", description: "Medical supplies", isDefault: false },
        { name: "GST 18%", rate: 18, sacCode: "9983", description: "Other services", isDefault: true },
        { name: "GST 28%", rate: 28, sacCode: "9983", description: "Luxury medical services", isDefault: false },
      ],
    },
    defaultGSTRate: {
      type: Number,
      default: 18,
    },
    // Invoice Settings
    invoiceSettings: {
      prefix: { type: String, default: "INV" },
      startingNumber: { type: Number, default: 1 },
      currentNumber: { type: Number, default: 1 },
      showQRCode: { type: Boolean, default: true },
      showLogo: { type: Boolean, default: true },
      termsAndConditions: { type: String },
      notes: { type: String },
      bankDetails: {
        bankName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        branchName: { type: String },
        accountType: { type: String, enum: ["savings", "current"], default: "current" },
      },
    },
    // E-Invoice
    eInvoiceSettings: {
      enabled: { type: Boolean, default: false },
      apiUsername: { type: String },
      apiPassword: { type: String },
      sandbox: { type: Boolean, default: true },
    },
    // E-Way Bill
    eWayBillSettings: {
      enabled: { type: Boolean, default: false },
      autoGenerate: { type: Boolean, default: false },
      thresholdAmount: { type: Number, default: 50000 },
    },
    // SAC Codes
    sacCodes: {
      type: [SACCodeSchema],
      default: [
        { code: "999311", description: "Hospital services", gstRate: 0, category: "Healthcare" },
        { code: "999312", description: "Medical and dental services", gstRate: 0, category: "Healthcare" },
        { code: "999313", description: "Childbirth and related services", gstRate: 0, category: "Healthcare" },
        { code: "999314", description: "Nursing and physiotherapy services", gstRate: 0, category: "Healthcare" },
        { code: "999315", description: "Ambulance services", gstRate: 0, category: "Healthcare" },
        { code: "999316", description: "Medical laboratory services", gstRate: 0, category: "Healthcare" },
        { code: "999317", description: "Blood bank services", gstRate: 0, category: "Healthcare" },
        { code: "999319", description: "Other human health services", gstRate: 0, category: "Healthcare" },
        { code: "998311", description: "Consulting medical services", gstRate: 18, category: "Professional" },
        { code: "998312", description: "Specialized medical services", gstRate: 18, category: "Professional" },
      ],
    },
    // Financial Year
    financialYear: {
      startMonth: { type: Number, default: 4 }, // April
      startDay: { type: Number, default: 1 },
    },
    tdsApplicable: { type: Boolean, default: false },
    tcsApplicable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const GSTConfig: Model<IGSTConfig> =
  mongoose.models.GSTConfig || mongoose.model<IGSTConfig>("GSTConfig", GSTConfigSchema);

export default GSTConfig;
