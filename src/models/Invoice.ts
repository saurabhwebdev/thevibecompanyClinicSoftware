import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInvoiceItem {
  productId?: Types.ObjectId;
  type: "product" | "service" | "medicine";
  name: string;
  description?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType: "percentage" | "fixed";
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  batchNumber?: string;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;

  // Patient/Customer
  patientId?: Types.ObjectId;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Related records
  appointmentId?: Types.ObjectId;
  prescriptionId?: Types.ObjectId;
  doctorId?: Types.ObjectId;

  // Items
  items: IInvoiceItem[];

  // Pricing
  subtotal: number;
  discountAmount: number;
  discountType: "percentage" | "fixed";
  taxableAmount: number;
  totalTax: number;
  totalAmount: number;
  roundOff: number;
  grandTotal: number;

  // Tax breakdown
  taxBreakdown: {
    taxName: string;
    taxRate: number;
    taxableAmount: number;
    taxAmount: number;
  }[];

  // Payment info
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded" | "cancelled";
  paidAmount: number;
  balanceAmount: number;
  paymentMethod?: "cash" | "card" | "upi" | "netbanking" | "cheque" | "insurance" | "other";

  // Status
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled" | "refunded";

  // Notes
  notes?: string;
  termsAndConditions?: string;
  internalNotes?: string;

  // Audit
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    type: {
      type: String,
      enum: ["product", "service", "medicine"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    hsnCode: String,
    sacCode: String,
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: "pcs",
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    taxRate: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    batchNumber: String,
  },
  { _id: true }
);

const InvoiceSchema: Schema<IInvoice> = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },

    // Patient/Customer
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
    },
    customerEmail: String,
    customerPhone: {
      type: String,
      required: [true, "Customer phone is required"],
    },
    customerAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    // Related records
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Items
    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: {
        validator: function (items: IInvoiceItem[]) {
          return items && items.length > 0;
        },
        message: "Invoice must have at least one item",
      },
    },

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "fixed",
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // Tax breakdown
    taxBreakdown: [{
      taxName: String,
      taxRate: Number,
      taxableAmount: Number,
      taxAmount: Number,
    }],

    // Payment info
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid", "refunded", "cancelled"],
      default: "unpaid",
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "netbanking", "cheque", "insurance", "other"],
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled", "refunded"],
      default: "draft",
    },

    // Notes
    notes: String,
    termsAndConditions: String,
    internalNotes: String,

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
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, invoiceDate: -1 });
InvoiceSchema.index({ tenantId: 1, patientId: 1 });
InvoiceSchema.index({ tenantId: 1, doctorId: 1 });
InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ tenantId: 1, paymentStatus: 1 });
InvoiceSchema.index({ tenantId: 1, createdAt: -1 });

// Pre-save hook to calculate balance
InvoiceSchema.pre("save", function () {
  this.balanceAmount = this.grandTotal - this.paidAmount;

  // Update payment status based on amounts
  if (this.paidAmount === 0) {
    this.paymentStatus = "unpaid";
  } else if (this.paidAmount >= this.grandTotal) {
    this.paymentStatus = "paid";
    this.balanceAmount = 0;
  } else {
    this.paymentStatus = "partial";
  }
});

// Delete cached model if it exists to ensure schema changes are applied
if (mongoose.models.Invoice) {
  delete mongoose.models.Invoice;
}

const Invoice: Model<IInvoice> = mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;
