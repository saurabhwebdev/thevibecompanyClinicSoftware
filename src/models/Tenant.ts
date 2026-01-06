import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPublicBookingSettings {
  isEnabled: boolean;
  bookingSlug: string; // unique slug for public booking URL
  clinicName: string;
  clinicDescription?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicLogo?: string;
  requirePhoneNumber: boolean;
  requireEmail: boolean;
  showDoctorFees: boolean;
  confirmationMessage?: string;
  termsAndConditions?: string;
  cancellationPolicy?: string;
  // CAPTCHA settings
  captchaEnabled: boolean;
  captchaSiteKey?: string;
  captchaSecretKey?: string;
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  settings: {
    theme?: string;
    logo?: string;
    primaryColor?: string;
  };
  publicBookingSettings: IPublicBookingSettings;
  createdAt: Date;
  updatedAt: Date;
}

const PublicBookingSettingsSchema = new Schema<IPublicBookingSettings>(
  {
    isEnabled: {
      type: Boolean,
      default: false,
    },
    bookingSlug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    clinicName: {
      type: String,
      trim: true,
    },
    clinicDescription: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    clinicAddress: {
      type: String,
      trim: true,
    },
    clinicPhone: {
      type: String,
      trim: true,
    },
    clinicEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    clinicLogo: {
      type: String,
    },
    requirePhoneNumber: {
      type: Boolean,
      default: true,
    },
    requireEmail: {
      type: Boolean,
      default: true,
    },
    showDoctorFees: {
      type: Boolean,
      default: true,
    },
    confirmationMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    termsAndConditions: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    cancellationPolicy: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    captchaEnabled: {
      type: Boolean,
      default: false,
    },
    captchaSiteKey: {
      type: String,
      trim: true,
    },
    captchaSecretKey: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const TenantSchema: Schema<ITenant> = new Schema(
  {
    name: {
      type: String,
      required: [true, "Tenant name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Tenant slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      theme: { type: String, default: "light" },
      logo: { type: String },
      primaryColor: { type: String, default: "#0066cc" },
    },
    publicBookingSettings: {
      type: PublicBookingSettingsSchema,
      default: () => ({
        isEnabled: false,
        bookingSlug: "",
        clinicName: "",
        requirePhoneNumber: true,
        requireEmail: true,
        showDoctorFees: true,
        captchaEnabled: false,
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Index for public booking slug lookup
TenantSchema.index({ "publicBookingSettings.bookingSlug": 1 }, { sparse: true });

const Tenant: Model<ITenant> =
  mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);

export default Tenant;
