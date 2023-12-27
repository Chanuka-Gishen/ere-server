import mongoose from "mongoose";
import { ACTIVE, INCATIVE } from "../../constants/commonConstants.js";

const Schema = mongoose.Schema;

const unitSchema = new Schema({
  unitModel: {
    type: String,
    required: true,
  },
  unitSerialNo: {
    type: String,
    required: true,
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
});

const Unit = mongoose.model("Unit", unitSchema);

export default Unit;
