import mongoose from "mongoose";
import {
  COMPLETED_STATUS,
  CREATED_STATUS,
  SCHEDULED_STATUS,
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
    enum: [WORK_ORD_SERVICE, WORK_ORD_REPAIR],
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
    { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  ],
  workOrderCreatedAt: {
    type: Date,
    default: Date.now(),
  },
});

// Creating models
export const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);
export const Image = mongoose.model("Image", imageSchema);
