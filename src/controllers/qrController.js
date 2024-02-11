import httpStatus from "http-status";

import { QRCodeModel } from "../models/dao/qrCodeModel.js";
import { uploadQrCodes } from "../services/googleApi.js";
import ApiResponse from "../services/ApiResponse.js";
import { bad_request_code, qr_success_code } from "../constants/statusCodes.js";
import { success_message } from "../constants/messageConstants.js";

export const createBulkQrCodes = async () => {
  const uploadedCodes = await uploadQrCodes();

  await QRCodeModel.insertMany(uploadedCodes)
    .then((result) => {
      console.log(`${result.length} QR codes inserted successfully`);
    })
    .catch((error) => {
      console.error("Error inserting QR codes:", error);
    });
};

export const getAvailableQrCodes = async (req, res) => {
  try {
    const availableQRCodes = await QRCodeModel.find({ qrCodeAvailable: true });

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(qr_success_code, success_message, availableQRCodes)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
