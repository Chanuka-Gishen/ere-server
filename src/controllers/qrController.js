import httpStatus from "http-status";

import { QRCodeModel } from "../models/dao/qrCodeModel.js";
import { uploadQrCodes } from "../services/googleApi.js";
import ApiResponse from "../services/ApiResponse.js";
import {
  bad_request_code,
  qr_error_code,
  qr_success_code,
} from "../constants/statusCodes.js";
import {
  qr_cannot_create_now,
  qr_generated,
  success_message,
} from "../constants/messageConstants.js";
import ConstantModel from "../models/dao/constantModel.js";
import { CONST_CODE_QR } from "../constants/commonConstants.js";

export const createBulkQrCodes = async (req, res) => {
  try {
    const qrAvailable = await ConstantModel.findOne({
      constantCode: CONST_CODE_QR,
    });

    if (!qrAvailable || !qrAvailable.constantIsAvailable) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(qr_error_code, qr_cannot_create_now));
    }

    qrAvailable.constantIsAvailable = false;

    const savedConstant = await qrAvailable.save();

    const uploadedCodes = await uploadQrCodes();

    await QRCodeModel.insertMany(uploadedCodes);

    savedConstant.constantIsAvailable = true;

    await savedConstant.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.error(qr_success_code, qr_generated));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
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

export const getAvailableQrCodeCount = async (req, res) => {
  try {
    const count = await QRCodeModel.countDocuments({ qrCodeAvailable: true });

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(qr_success_code, success_message, count));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const addConstant = async () => {
  const constant = new ConstantModel({
    constantCode: CONST_CODE_QR,
  });

  await constant.save();
};
