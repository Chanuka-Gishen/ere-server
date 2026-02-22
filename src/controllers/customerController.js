import httpStatus from "http-status";
import {
  bad_request_code,
  customer_error_code,
  customer_success_code,
  error_code,
} from "../constants/statusCodes.js";
import { customerRegisterSchema } from "../schemas/customerSchema.js";
import Customer from "../models/customerModel.js";
import ApiResponse from "../services/ApiResponse.js";
import {
  customer_exists,
  customer_id_required,
  customer_not_found,
  customer_registered,
  success_message,
} from "../constants/messageConstants.js";
import { ObjectId } from "mongodb";
import { customerUpdateSchema } from "../schemas/customerUpdateScehema.js";
import { isValidString } from "../services/commonServices.js";
import Unit from "../models/unitModel.js";
import LogsModel from "../models/logsModel.js";

// Register customer
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

    const nameRegex = new RegExp(customerName.replace(/\s+/g, ""), "i");

    const existingUser = await Customer.findOne({
      customerName: { $regex: nameRegex },
    });

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

    if (customerName != customer.customerName) {
      const nameRegex = new RegExp(customerName.replace(/\s+/g, ""), "i");

      const existingUser = await Customer.findOne({
        customerName: { $regex: nameRegex },
      });

      if (existingUser) {
        return res
          .status(httpStatus.BAD_REQUEST)
          .json(ApiResponse.error(customer_error_code, customer_exists));
      }
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
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const filterMobile = req.query.customerTel;

    const skip = page * limit;

    // Build the $match stage for search with null/empty checks
    const matchStage = {
      ...(isValidString(filterMobile) && {
        "customerTel.mobile": {
          $regex: `^${filterMobile}`,
          $options: "i",
        },
      }),
    };

    const pipeline = [
      // Fetch all customers
      {
        $match: matchStage, // You can add any match condition if needed
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
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const data = await Customer.aggregate(pipeline);
    // Step 1: Count documents that match the filter
    const count = await Customer.countDocuments(matchStage);

    return res.status(httpStatus.OK).json(
      ApiResponse.response(customer_success_code, success_message, {
        data,
        count,
      }),
    );
  } catch (error) {
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
        ApiResponse.response(customer_success_code, success_message, customer),
      );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get customers with recent upcoming maintainence - within one week
export const GetUpcomingMaintainences = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;

  const skip = page * limit;

  const today = new Date();

  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  try {
    const result = await Unit.aggregate([
      {
        $match: {
          unitNextMaintenanceDate: { $gte: today, $lte: nextWeek },
        },
      },
      {
        $sort: { unitNextMaintenanceDate: 1 },
      },
      {
        $group: {
          _id: "$unitCustomerId",
          unit: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const count = await Unit.countDocuments({
      unitNextMaintenanceDate: { $gte: today, $lte: nextWeek },
    });

    return res.status(httpStatus.OK).json(
      ApiResponse.response(customer_success_code, success_message, {
        data: result,
        count,
      }),
    );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get customers remainders logs
export const getCustomersRemainderLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;

  const skip = page * limit;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const lastweek = new Date();
  lastweek.setDate(today.getDate() - 7);
  lastweek.setHours(0, 0, 0, 0);

  try {
    const result = await LogsModel.aggregate([
      {
        $match: {
          logsType: "Remainder",
          createdAt: {
            $gte: lastweek,
            $lte: today,
          },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "logsCustomer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $sort: { createdAt: 1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const count = await LogsModel.countDocuments({
      createdAt: { $gte: today, $lte: lastweek },
    });

    return res.status(httpStatus.OK).json(
      ApiResponse.response(customer_success_code, success_message, {
        data: result,
        count,
      }),
    );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get customer remainder logs
export const getCustomerRemainderLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const id = req.query.id;

  const skip = page * limit;

  try {
    const data = await LogsModel.find({ logsCustomer: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const count = await LogsModel.countDocuments({
      logsCustomer: new ObjectId(id),
    });

    return res.status(httpStatus.OK).json(
      ApiResponse.response(customer_success_code, success_message, {
        data,
        count,
      }),
    );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Send remainder to customer - manual
export const sendCustomerServiceRemainder = async (req, res) => {
  const id = req.query.id;

  if (!id) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(error_code, customer_id_required));
  }

  try {
    const customer = await Customer.findById(new ObjectId(id));

    if (!customer) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(error_code, customer_not_found));
    }

    await LogsModel.create({
      logsCustomer: new ObjectId(customer._id),
      logsType: "Remainder",
    });

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, success_message));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Send remainders to customers - Cron Job
export const SetRemindersToCustomers = async () => {
  const today = new Date();

  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const customersWithMaintenance = await Unit.aggregate([
    {
      $match: {
        unitNextMaintenanceDate: { $gte: today, $lte: nextWeek },
      },
    },
    {
      $sort: { unitNextMaintenanceDate: 1 },
    },
    {
      $group: {
        _id: "$unitCustomerId",
        nearestUnit: { $first: "$$ROOT" },
      },
    },
  ]);

  for (const record of customersWithMaintenance) {
    const customerId = record._id;

    const messageExists = await LogsModel.findOne({
      logsCustomer: new ObjectId(customerId),
      logsType: "Remainder",
      createdAt: { $gte: monthStart, $lte: today },
    });

    if (!messageExists) {
      // Send a new message
      const newMessage = new LogsModel({
        logsCustomer: record._id,
        logsMessage: ``,
        logsType: "Remainder",
      });

      await newMessage.save();
      console.log("Remainder sent");
    } else {
      console.log("Remainder sent already");
    }
  }

  return;
};
