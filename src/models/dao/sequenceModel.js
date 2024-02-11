import mongoose from "mongoose";
import {
  INSTALLATION_SEQ,
  QR_SEQUENCE,
  REPAIR_SEQ,
  SERVICE_SEQ,
} from "../../constants/commonConstants.js";

const Schema = mongoose.Schema;

const sequenceSchema = new Schema({
  sequenceType: {
    type: String,
    required: true,
    enum: [INSTALLATION_SEQ, SERVICE_SEQ, REPAIR_SEQ, QR_SEQUENCE],
    unique: true,
  },
  sequenceValue: {
    type: Number,
    default: 0,
  },
});

const Sequence = mongoose.model("Sequence", sequenceSchema);

export default Sequence;
