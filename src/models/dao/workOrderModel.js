import mongoose from "mongoose";
import {
  COMPLETED_STATUS,
  CREATED_STATUS,
  SCHEDULED_STATUS,
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
      itemCost: {
        type: Number,
        default: 0,
      },
    },
  ],
  labourCharges: {
    description: {
      type: String,
      default: "",
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
    amount: {
      type: Number,
      default: 0,
    },
  },
  otherChargers: {
    description: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
    },
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
    enum: [CREATED_STATUS, SCHEDULED_STATUS, COMPLETED_STATUS],
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
