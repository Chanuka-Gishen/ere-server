import mongoose from "mongoose";
import {
  COMPLETED_STATUS,
  PENDING_STATUS,
} from "../../constants/commonConstants";

const Schema = mongoose.Schema;

// Image Schema
const imageSchema = new Schema({
  imageUploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  imageUrl: {
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
  workOrderNumber: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  scheduledDate: {
    type: Date,
  },
  completedDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: [PENDING_STATUS, COMPLETED_STATUS],
    default: PENDING_STATUS,
  },
  invoiceNumber: {
    type: Number,
  },
  images: [imageSchema],
  acUnitReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ACUnit",
    required: true,
  },
  assignedEmployees: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  ],
});

// Creating models
const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);
const Image = mongoose.model("Image", imageSchema);

// Exporting models
module.exports = {
  WorkOrder,
  Image,
};
