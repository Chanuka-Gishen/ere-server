import mongoose from "mongoose";
import { ACTIVE, INCATIVE } from "../../constants/commonConstants.js";

const Schema = mongoose.Schema;

const unitSchema = new Schema({
  unitBrand: {
    type: String,
    required: true,
    default: null,
  },
  unitModel: {
    type: String,
    required: true,
  },
  unitSerialNo: {
    type: String,
  },
  unitCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  unitInstalledDate: {
    type: Date,
    default: null,
  },
  unitLastMaintenanceDate: {
    type: Date,
    required: true,
  },
  unitNextMaintenanceDate: {
    type: Date,
    required: true,
  },
  unitStatus: {
    type: String,
    enum: [ACTIVE, INCATIVE],
    default: ACTIVE,
  },
  unitQrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QRCode",
    default: null,
  },
});

const Unit = mongoose.model("Unit", unitSchema);

export default Unit;
