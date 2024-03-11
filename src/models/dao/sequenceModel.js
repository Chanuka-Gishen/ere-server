import mongoose from "mongoose";
import {
  INSTALLATION_SEQ,
  INVOICE_SEQUENCE,
  QR_SEQUENCE,
  REPAIR_SEQ,
  SERVICE_SEQ,
} from "../../constants/commonConstants.js";

const Schema = mongoose.Schema;

const sequenceSchema = new Schema({
  sequenceType: {
    type: String,
    required: true,
    enum: [
      INSTALLATION_SEQ,
      SERVICE_SEQ,
      REPAIR_SEQ,
      QR_SEQUENCE,
      INVOICE_SEQUENCE,
    ],
    unique: true,
  },
  sequenceValue: {
    type: Number,
    default: 0,
  },
});

const Sequence = mongoose.model("Sequence", sequenceSchema);

export default Sequence;
