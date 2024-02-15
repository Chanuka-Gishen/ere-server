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
          let: { customerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$unitCustomerId", "$$customerId"] }, // Match units with the same customer id
              },
            },
            {
              $sort: {
                unitNextMaintenanceDate: 1, // Sort units by nextMaintenanceDate
              },
            },
            {
              $limit: 1, // Take only the first unit
            },
          ],
          as: "units",
        },
      },
      // Project to add a field indicating if the customer has units
      {
        $addFields: {
          hasUnits: { $gt: [{ $size: "$units" }, 0] }, // Check if units array is not empty
        },
      },
      // Add nextMaintenanceDate only if units exist for the customer
      {
        $addFields: {
          nextMaintenanceDate: {
            $cond: {
              if: "$hasUnits",
              then: { $arrayElemAt: ["$units.unitNextMaintenanceDate", 0] }, // Take nextMaintenanceDate of the first unit
              else: null, // Set to null if no units exist
            },
          },
        },
      },
      // Sort customers with units first by nextMaintenanceDate of the first unit
      {
        $sort: {
          hasUnits: -1, // Sort by whether the customer has units (customers with units come first)
          nextMaintenanceDate: 1, // Then sort by nextMaintenanceDate of the first unit
        },
      },
      // Optionally project to exclude units object and hasUnits field
      {
        $project: {
          units: 0,
          hasUnits: 0,
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
