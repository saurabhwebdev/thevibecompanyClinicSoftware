import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaxRate {
  name: string;
  rate: number;
  code?: string;
  description?: string;
  isDefault?: boolean;
  category?: string;
}

export interface ITaxCode {
  code: string;
  description: string;
  rate: number;
  category: string;
}

export interface ITaxConfig extends Document {
  tenantId: mongoose.Types.ObjectId;

  // Country Selection
  countryCode: string; // IN, AE, PH, KE

  // Common Business Details
  registrationNumber: string; // GSTIN, TRN, TIN, KRA PIN
  legalName: string;
  tradeName?: string;
  businessType: string;

  // Common Address
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    postalCode: string;
    country: string;
  };

  // Contact Details
  email: string;
  phone: string;

  // Tax Settings
  registrationType: string;
  defaultTaxRate: number;
  taxRates: ITaxRate[];

  // Tax Codes (SAC, HS, PSIC, etc.)
  taxCodes: ITaxCode[];

  // Invoice Settings (Common)
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
      routingCode: string; // IFSC, IBAN, etc.
      branchName?: string;
      accountType: string;
      swiftCode?: string;
    };
  };

  // E-Invoice/Digital Compliance Settings
  digitalCompliance: {
    enabled: boolean;
    systemType?: string; // e-Invoice, TIMS, CAS, etc.
    apiCredentials?: {
      username?: string;
      password?: string;
      apiKey?: string;
    };
    sandbox: boolean;
    deviceSerialNumber?: string; // ETR, etc.
  };

  // Country-Specific Fields (flexible schema)
  countrySpecific: Record<string, unknown>;

  // Financial Year
  financialYear: {
    startMonth: number;
    startDay: number;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaxRateSchema = new Schema<ITaxRate>(
  {
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    code: { type: String },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    category: { type: String },
  },
  { _id: false }
);

const TaxCodeSchema = new Schema<ITaxCode>(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    rate: { type: Number, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const TaxConfigSchema: Schema<ITaxConfig> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
    },

    // Country
    countryCode: {
      type: String,
      required: [true, "Country is required"],
      uppercase: true,
      trim: true,
      enum: ["IN", "AE", "PH", "KE"], // Add more as needed
    },

    // Business Details
    registrationNumber: {
      type: String,
      required: [true, "Tax registration number is required"],
      uppercase: true,
      trim: true,
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
      required: true,
    },

    // Address
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      stateCode: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
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

    // Tax Settings
    registrationType: {
      type: String,
      required: true,
    },
    defaultTaxRate: {
      type: Number,
      default: 0,
    },
    taxRates: {
      type: [TaxRateSchema],
      default: [],
    },
    taxCodes: {
      type: [TaxCodeSchema],
      default: [],
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
        routingCode: { type: String },
        branchName: { type: String },
        accountType: { type: String, default: "current" },
        swiftCode: { type: String },
      },
    },

    // Digital Compliance
    digitalCompliance: {
      enabled: { type: Boolean, default: false },
      systemType: { type: String },
      apiCredentials: {
        username: { type: String },
        password: { type: String },
        apiKey: { type: String },
      },
      sandbox: { type: Boolean, default: true },
      deviceSerialNumber: { type: String },
    },

    // Country-Specific Fields
    countrySpecific: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Financial Year
    financialYear: {
      startMonth: { type: Number, default: 1 },
      startDay: { type: Number, default: 1 },
    },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const TaxConfig: Model<ITaxConfig> =
  mongoose.models.TaxConfig || mongoose.model<ITaxConfig>("TaxConfig", TaxConfigSchema);

export default TaxConfig;
