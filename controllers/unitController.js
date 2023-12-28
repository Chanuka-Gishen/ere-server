import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import ApiResponse from "../services/ApiResponse.js";
import {
  bad_request_code,
  customer_error_code,
  customer_success_code,
} from "../constants/statusCodes.js";
import { unitAddSchema } from "../schemas/unitAddSchema.js";
import Unit from "../models/dao/unitModel.js";
import Customer from "../models/dao/customerModel.js";
import {
  customer_not_found,
  customer_unit_added,
  customer_unit_not_found,
  customer_unit_updated,
  success_message,
} from "../constants/messageConstants.js";
import { unitUpdateSchema } from "../schemas/unitUpdateSchema.js";

export const AddCustomerUnit = async (req, res) => {
  try {
    const { error, value } = unitAddSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const {
      customerId,
      unitModel,
      unitSerialNo,
      unitInstalledDate,
      unitNextMaintenanceDate,
      unitStatus,
    } = value;

    const customer = await Customer.findById(new ObjectId(customerId));

    if (!customer) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_not_found));
    }

    const newUnit = new Unit({
      unitCustomerId: customer._id,
      unitModel,
      unitSerialNo,
      unitInstalledDate,
      unitLastMaintenanceDate: unitInstalledDate,
      unitNextMaintenanceDate,
      unitStatus,
    });

    await newUnit.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, customer_unit_added));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const updateCustomerUnit = async (req, res) => {
  try {
    const { error, value } = unitUpdateSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const {
      _id,
      unitModel,
      unitSerialNo,
      unitInstalledDate,
      unitLastMaintenanceDate,
      unitNextMaintenanceDate,
      unitStatus,
    } = value;

    const unit = await Unit.findById(new ObjectId(_id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    unit.unitModel = unitModel;
    unit.unitSerialNo = unitSerialNo;
    unit.unitInstalledDate = unitInstalledDate;
    unit.unitLastMaintenanceDate = unitLastMaintenanceDate;
    unit.unitNextMaintenanceDate = unitNextMaintenanceDate;
    unit.unitStatus = unitStatus;

    await unit.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, customer_unit_updated));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getCustomerUnits = async (req, res) => {
  try {
    const { id } = req.params;

    const units = await Unit.find({ unitCustomerId: new ObjectId(id) });

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(customer_success_code, success_message, units)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
