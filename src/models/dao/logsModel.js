import mongoose from "mongoose";

const Schema = mongoose.Schema;

const logsSchema = new Schema({
  logsCustomer: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  logsMessage: {
    type: String,
    required: true,
  },
  logsCreatedDate: {
    type: Date,
    default: Date.now(),
  },
});

const LogsModel = mongoose.model("Logs", logsSchema);

export default LogsModel;
