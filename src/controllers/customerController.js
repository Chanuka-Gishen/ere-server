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
  customer_not_found,
  customer_registered,
  success_message,
} from "../constants/messageConstants.js";
import { ObjectId } from "mongodb";
import { customerUpdateSchema } from "../schemas/customerUpdateScehema.js";

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
    } = value;

    const existingUser = await Customer.findOne({ customerName });

    if (existingUser) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(customer_error_code, customer_exists));
    }

    const customerCode = createClientCode(customerName);

    const customer = new Customer({
      customerName: customerName,
      customerCode: customerCode,
      customerAddress: customerAddress,
      customerEmail: customerEmail,
      customerTel: {
        mobile: customerMobile,
        landline: customerLand,
      },
    });

    await customer.save();

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

export const updateCustomer = async (req, res) => {
  try {
    const { error, value } = customerUpdateSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }
    const {
      customerId,
      customerName,
      customerAddress,
      customerMobile,
      customerLand,
      customerEmail,
    } = value;

    const customer = await Customer.findById(new ObjectId(customerId));

    if (!customer) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.response(customer_error_code, customer_not_found));
    }

    customer.customerName = customerName;
    customer.customerAddress = customerAddress;
    customer.customerEmail = customerEmail;
    customer.customerTel.mobile = customerMobile;
    customer.customerTel.landline = customerLand;

    await customer.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, success_message));
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

export const getCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(new ObjectId(customerId));

    if (!customer) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.response(customer_error_code, customer_not_found));
    }

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(customer_success_code, success_message, customer)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

const createClientCode = (clientName) => {
  // Split the full name into words
  const words = clientName.split(" ");

  // Extract the first letter of each word and concatenate them
  const initials = words.map((word) => word.charAt(0)).join("");

  return initials.slice(0, 4).toUpperCase();
};
