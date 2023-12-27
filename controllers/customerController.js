import httpStatus from "http-status";
import {
  bad_request_code,
  customer_error_code,
  customer_success_code,
} from "../constants/statusCodes.js";
import { customerRegisterSchema } from "../schemas/customerSchema.js";
import Customer from "../models/dao/customerModel.js";
import ApiResponse from "../services/ApiResponse.js";
import {
  customer_exists,
  customer_registered,
  success_message,
} from "../constants/messageConstants.js";
import Unit from "../models/dao/unitModel.js";

export const registerCustomer = async (req, res) => {
  try {
    const { error, value } = customerRegisterSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const {
      customerName,
      customerAddress,
      customerMobile,
      customerLand,
      customerEmail,
      customerUnits,
    } = value;

    const existingUser = await Customer.findOne({ customerName });

    if (existingUser) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(customer_error_code, customer_exists));
    }

    const customer = new Customer({
      customerName: customerName,
      customerAddress: customerAddress,
      customerEmail: customerEmail,
      customerTel: {
        mobile: customerMobile,
        landline: customerLand,
      },
    });

    const savedCustomer = await customer.save();

    const unitsWithIds = customerUnits.map((unit) => ({
      ...unit,
      unitLastMaintenanceDate: unit.unitInstalledDate,
      unitCustomerId: savedCustomer._id,
    }));

    await Unit.insertMany(unitsWithIds);

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, customer_registered));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(customer_success_code, success_message, customers)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
