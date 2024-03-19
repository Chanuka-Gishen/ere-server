import mongoose from "mongoose";
import {
  CMP_ERE,
  CMP_SINGER,
  COMPLETED_STATUS,
  CREATED_STATUS,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../../constants/commonConstants.js";

const Schema = mongoose.Schema;

// Image Schema
const imageSchema = new Schema({
  imageUploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  imageId: {
    type: String,
    required: true,
  },
  imageFileName: {
    type: String,
    required: true,
  },
  imageMimeType: {
    type: String,
    required: true,
  },
  imageWebUrl: {
    type: String,
    required: true,
  },
  imageContentUrl: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now(),
  },
});

const chargersSchema = new Schema({
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
  grandNetTotal: {
    type: Number,
    default: 0,
  },
  grandTotal: {
    type: Number,
    default: 0,
  },
});

// Work Order Schema
const workOrderSchema = new Schema({
  workOrderCode: {
    type: String,
    unique: true,
    required: true,
  },
  workOrderFrom: {
    type: String,
    enum: [CMP_ERE, CMP_SINGER],
    default: CMP_ERE,
  },
  workOrderCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  workOrderScheduledDate: {
    type: Date,
  },
  workOrderCompletedDate: {
    type: Date,
    default: null,
  },
  workOrderType: {
    type: String,
    required: true,
    enum: [WORK_ORD_INSTALLATION, WORK_ORD_SERVICE, WORK_ORD_REPAIR],
  },
  workOrderStatus: {
    type: String,
    enum: [CREATED_STATUS, COMPLETED_STATUS],
    default: CREATED_STATUS,
  },
  workOrderInvoiceNumber: {
    type: String,
    default: null,
  },
  workOrderImages: [imageSchema],
  workOrderUnitReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
    required: true,
  },
  workOrderAssignedEmployees: [
    {
      employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
      tip: {
        amount: { type: Number, default: 0 },
      },
    },
  ],
  workOrderEmployeeTip: {
    type: Number,
    default: 0,
  },
  workOrderChargers: {
    type: chargersSchema,
    default: null,
  },
  workOrderCreatedAt: {
    type: Date,
    default: Date.now(),
  },
});

// Creating models
export const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);
export const ImageModel = mongoose.model("Image", imageSchema);
