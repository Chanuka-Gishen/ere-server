import mongoose from "mongoose";
import {
  CMP_ERE,
  CMP_SINGER,
  CMP_SINGER_DIR,
  CMP_SINHAGIRI,
  CMP_SINHAGIRI_DIR,
  COMPLETED_STATUS,
  CREATED_STATUS,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";

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

// Work Order Schema
const workOrderSchema = new Schema({
  workOrderCode: {
    type: String,
    unique: true,
    required: true,
  },
  workOrderCodeSub: {
    type: String,
    default: null,
  },
  workOrderFrom: {
    type: String,
    enum: [
      CMP_ERE,
      CMP_SINGER,
      CMP_SINGER_DIR,
      CMP_SINHAGIRI,
      CMP_SINHAGIRI_DIR,
    ],
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
  workOrderInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
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
      _id: false,
    },
  ],
  workOrderEmployeeTip: {
    type: Number,
    default: 0,
  },
  workOrderLinked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
    },
  ],
  workOrderLinkedInvoiceNo: {
    type: String,
    default: null,
  },
  workOrderQuotationApproved: {
    type: Boolean,
    default: false,
  },
  workOrderCreatedAt: {
    type: Date,
    default: Date.now(),
  },
});

// Creating models
export const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);
export const ImageModel = mongoose.model("Image", imageSchema);
