import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPayment extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  paymentNumber: string;

  // Related records
  invoiceId: Types.ObjectId;
  patientId?: Types.ObjectId;

  // Payment details
  amount: number;
  paymentDate: Date;
  paymentMethod: "cash" | "card" | "upi" | "netbanking" | "cheque" | "insurance" | "other";

  // Method-specific details
  transactionId?: string;
  chequeNumber?: string;
  chequeDate?: Date;
  bankName?: string;
  cardLast4?: string;
  cardType?: string;
  upiId?: string;
  insuranceClaimNumber?: string;
  insuranceProvider?: string;

  // Status
  status: "pending" | "completed" | "failed" | "refunded" | "cancelled";

  // Refund info
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
  refundTransactionId?: string;

  // Notes
  notes?: string;

  // Receipt
  receiptNumber?: string;
  receiptGenerated: boolean;

  // Audit
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema<IPayment> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    paymentNumber: {
      type: String,
      required: true,
    },

    // Related records
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
    },

    // Payment details
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "netbanking", "cheque", "insurance", "other"],
      required: [true, "Payment method is required"],
    },

    // Method-specific details
    transactionId: String,
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    cardLast4: String,
    cardType: String,
    upiId: String,
    insuranceClaimNumber: String,
    insuranceProvider: String,

    // Status
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "completed",
    },

    // Refund info
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundDate: Date,
    refundReason: String,
    refundTransactionId: String,

    // Notes
    notes: String,

    // Receipt
    receiptNumber: String,
    receiptGenerated: {
      type: Boolean,
      default: false,
    },

    // Audit
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PaymentSchema.index({ tenantId: 1, paymentNumber: 1 }, { unique: true });
PaymentSchema.index({ tenantId: 1, invoiceId: 1 });
PaymentSchema.index({ tenantId: 1, patientId: 1 });
PaymentSchema.index({ tenantId: 1, paymentDate: -1 });
PaymentSchema.index({ tenantId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, paymentMethod: 1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
