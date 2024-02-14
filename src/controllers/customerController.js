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
      customerLocation,
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
    customer.customerLocation = customerLocation;

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
    //const customers = await Customer.find();

    const pipeline = [
      // Fetch all customers
      {
        $match: {}, // You can add any match condition if needed
      },
      // Join customers with units
      {
        $lookup: {
          from: "units",
          localField: "_id",
          foreignField: "unitCustomerId",
          as: "units",
        },
      },
      // Sort units within each group by nextMaintenanceDate
      {
        $unwind: "$units", // Unwind units to sort
      },
      {
        $sort: {
          "units.unitNextMaintenanceDate": 1, // Sort units by nextMaintenanceDate
        },
      },
      {
        $group: {
          _id: "$_id",
          customer: { $first: "$$ROOT" }, // Preserve the customer document
          firstUnit: { $first: "$units" }, // Take the first unit from each group
        },
      },
      {
        $addFields: {
          "customer.nextMaintenanceDate": "$firstUnit.unitNextMaintenanceDate", // Replace "fieldName" with the actual field name
        },
      },
      // Replace root with the customer document
      {
        $replaceRoot: {
          newRoot: "$customer",
        },
      },
      // Optionally project to exclude units object
      {
        $project: {
          units: 0,
        },
      },
      //Optionally sort customers by some criteria
      {
        $sort: {
          nextMaintenanceDate: 1,
        },
      },
    ];

    const customers = await Customer.aggregate(pipeline);

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
