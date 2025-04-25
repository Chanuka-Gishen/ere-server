import mongoose from "mongoose";

const Schema = mongoose.Schema;

const logsSchema = new Schema({
  logsCustomer: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  logsType:{
    type: String,
    enum: ['Remainder', 'Notification'],
    required: true
  },
},{ timestamps: true });

const LogsModel = mongoose.model("Logs", logsSchema);

export default LogsModel;
