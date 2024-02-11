import mongoose from "mongoose";

const Schema = mongoose.Schema;

const qrCodeSchema = new Schema({
  qrCodeFileId: {
    type: String,
    required: true,
  },
  qrCodeName: {
    type: String,
    required: true,
  },
  qrCodeMimeType: {
    type: String,
    required: true,
  },
  qrCodeFileName: {
    type: String,
    required: true,
  },
  qrCodeAvailable: {
    type: Boolean,
    default: true,
  },
  qrCodeFileViewUrl: {
    type: String,
    required: true,
  },
  qrCodeFileDownloadUrl: {
    type: String,
    required: true,
  },
});

export const QRCodeModel = mongoose.model("QRCode", qrCodeSchema);
