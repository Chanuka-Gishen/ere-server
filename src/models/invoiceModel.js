import mongoose from "mongoose";
import { INV_CLOSED, INV_CREATED } from "../constants/inoviceStatus.js";

const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
  invoiceNumber: {
    type: String,
    default: null,
  },
  invoiceNumberPrevious: {
    type: String,
    default: null,
  },
  invoiceStatus: {
    type: String,
    enum: [INV_CREATED, INV_CLOSED],
    default: INV_CLOSED,
  },
  invoiceLinkedTo: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
    },
  ],
  invoiceLinkedWorkOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WorkOrder",
  },
  invoiceLinkedCustomer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  invoiceLinkedUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
  },
  items: [
    {
      item: {
        default: "",
        type: String,
      },
      itemDescription: {
        default: "",
        type: String,
      },
      itemQty: {
        type: Number,
        default: 1,
      },
      itemNetPrice: {
        type: Number,
        default: 0,
      },
      itemGrossPrice: {
        type: Number,
        default: 0,
      },
    },
  ],
  serviceCharges: {
    description: {
      type: String,
      default: "",
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  labourCharges: {
    description: {
      type: String,
      default: "",
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  transportCharges: {
    description: {
      type: String,
      default: "",
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  otherCharges: {
    description: {
      type: String,
      default: "",
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  discount: {
    percentage: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  grandNetTotal: {
    type: Number,
    default: 0,
  },
  grandTotal: {
    type: Number,
    default: 0,
  },
});

export const InvoiceModel = mongoose.model("Invoice", invoiceSchema);
