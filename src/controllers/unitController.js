import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import ExcelJS from "exceljs";
import ApiResponse from "../services/ApiResponse.js";
import {
  bad_request_code,
  customer_error_code,
  customer_success_code,
  qr_error_code,
} from "../constants/statusCodes.js";
import { unitAddSchema } from "../schemas/unitAddSchema.js";
import Unit from "../models/unitModel.js";
import Customer from "../models/customerModel.js";
import {
  customer_not_found,
  customer_unit_added,
  customer_unit_cannot_delete,
  customer_unit_deleted,
  customer_unit_not_found,
  customer_unit_updated,
  qr_not_available,
  qr_not_found,
  qr_removed,
  success_message,
} from "../constants/messageConstants.js";
import { unitUpdateSchema } from "../schemas/unitUpdateSchema.js";
import { WorkOrder } from "../models/workOrderModel.js";
import { unitDetailsUpdateSchema } from "../schemas/unitDetailsUpdateSchema.js";
import { QRCodeModel } from "../models/qrCodeModel.js";
import { unitUpdateQrSchema } from "../schemas/unitUpdateQrSchema.js";
import AirConditionerModel from "../models/airConditionerModel.js";
import { unitsFilterSchema } from "../schemas/unitsFilterSchema.js";
import { UNIT_ORDER_BY } from "../constants/orderByConstants.js";
import { isValidString } from "../services/commonServices.js";

// Add customer unit
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
      unitBrand,
      unitModel,
      unitSerialNo,
      unitInstalledDate,
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
      unitBrand: unitBrand.toUpperCase(),
      unitModel: unitModel.toUpperCase(),
      unitSerialNo: unitSerialNo.toUpperCase(),
      unitInstalledDate,
      unitStatus,
    });

    const unit = await newUnit.save();

    // Check if the brand exists
    let existingBrand = await AirConditionerModel.findOne({
      brand: unit.unitBrand.trim().toUpperCase(),
    });

    if (existingBrand) {
      // If brand exists, check if model exists
      if (!existingBrand.models.includes(unit.unitModel)) {
        existingBrand.models.push(unit.unitModel);
        await existingBrand.save();
      }
    } else {
      // If brand doesn't exist, create a new document
      const airConditioner = new AirConditionerModel({
        brand: unit.unitBrand.trim().toUpperCase(),
        models: [unit.unitModel],
      });
      await airConditioner.save();
    }

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, customer_unit_added));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Update customer unit
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
      unitBrand,
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

    unit.unitBrand = unitBrand;
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
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get unit details from unitId
export const getUnitDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findById(new ObjectId(id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, success_message, unit));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Delete customer unit
export const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findById(new ObjectId(id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    const workOrders = await WorkOrder.find({
      workOrderUnitReference: new ObjectId(id),
    });

    if (workOrders.length > 0) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          ApiResponse.error(customer_error_code, customer_unit_cannot_delete),
        );
    }

    if (unit.unitQrCode) {
      const qrCode = await QRCodeModel.findById(unit.unitQrCode);

      qrCode.qrCodeAvailable = true;

      await qrCode.save();
    }

    await Unit.deleteOne(unit);

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, customer_unit_deleted));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Update unit serial number
export const updateUnitSerialNumber = async (req, res) => {
  try {
    const { error, value } = unitDetailsUpdateSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { _id, unitSerialNo } = value;

    const unit = await Unit.findById(new ObjectId(_id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    unit.unitSerialNo = unitSerialNo;

    await unit.save();
    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, customer_unit_updated));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// update unit qr code
export const updateUnitQrCode = async (req, res) => {
  try {
    const { error, value } = unitUpdateQrSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { unitId, qrCodeName } = value;

    const qrCode = await QRCodeModel.findOne({ qrCodeName: qrCodeName });

    if (!qrCode) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(qr_error_code, qr_not_found));
    }

    if (!qrCode.qrCodeAvailable) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(qr_error_code, qr_not_available));
    }

    const unit = await Unit.findById(new ObjectId(unitId));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    unit.unitQrCode = qrCode._id;

    await unit.save();

    qrCode.qrCodeAvailable = false;

    await qrCode.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, success_message));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const removeQrFromUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findById(new ObjectId(id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    const qrCode = await QRCodeModel.findById(new ObjectId(unit.unitQrCode));

    if (!qrCode) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(qr_error_code, qr_not_found));
    }

    unit.unitQrCode = null;

    await unit.save();

    qrCode.qrCodeAvailable = true;

    await qrCode.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(customer_success_code, qr_removed));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getCustomerUnits = async (req, res) => {
  try {
    const { id } = req.params;

    const units = await Unit.find({
      unitCustomerId: new ObjectId(id),
    })
      .populate("unitQrCode")
      .sort({ unitNextMaintenanceDate: 1 })
      .exec();

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(customer_success_code, success_message, units),
      );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getCustomerUnitDetailsFromQrCode = async (req, res) => {
  try {
    const { qrCodeName } = req.params;

    const qrCode = await QRCodeModel.findOne({ qrCodeName: qrCodeName });

    if (!qrCode) {
      return res
        .status(httpStatus.OK)
        .json(ApiResponse.response(customer_error_code, qr_not_found));
    }

    const unit = await Unit.findOne({ unitQrCode: qrCode._id })
      .populate("unitCustomerId")
      .populate("unitQrCode");

    if (!unit) {
      return res
        .status(httpStatus.OK)
        .json(ApiResponse.response(customer_error_code, qr_not_available));
    }

    const workOrders = await WorkOrder.find({
      workOrderUnitReference: unit._id,
    }).populate("workOrderInvoice");

    return res.status(httpStatus.OK).json(
      ApiResponse.response(customer_success_code, success_message, {
        unit: unit,
        workOrders: workOrders,
      }),
    );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get units sorted and group by next maintenance date
export const getUnitsForCalender = async (req, res) => {
  try {
    const filteredMonth = req.query.filteredMonth;

    // Calculate the first and last dates of the month
    const [year, month] = filteredMonth.split("-").map(Number); // Split into year and month
    const startDate = new Date(Date.UTC(year, month - 1, 1)); // Start of the month
    const endDate = new Date(Date.UTC(year, month, 1));

    const units = await Unit.aggregate([
      {
        $match: {
          unitNextMaintenanceDate: {
            $ne: null,
            $gte: startDate, // Greater than or equal to the start of the month
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$unitNextMaintenanceDate",
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $project: {
          unitNextMaintenanceDate: "$_id",
        },
      },
    ]);

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(customer_success_code, success_message, units),
      );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get units for the selected date in the calender
export const getUnitsForCalenderDetails = async (req, res) => {
  try {
    const { selectedDate } = req.params;

    const filterDate = new Date(selectedDate);
    const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));

    const units = await Unit.find({
      unitNextMaintenanceDate: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("unitCustomerId")
      .populate("unitQrCode");

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(customer_success_code, success_message, units),
      );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get saved unit brands and models
export const getUnitSavedBrandsAndModelsController = async (req, res) => {
  try {
    const result = await AirConditionerModel.find();

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(customer_success_code, success_message, result),
      );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get all units - Admin - with filter options
export const getAllUnits = async (req, res) => {
  const { error, value } = unitsFilterSchema.validate(req.body);

  if (error) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const skip = page * limit;

    const {
      customerName,
      qrCode,
      customerMobileNumber,
      unitSerialNo,
      qrCodeLinked,
      unitNextMaintenanceDate,
      orderBy,
    } = value;

    const query = {};

    // QR Code linked filter
    if (qrCodeLinked !== null) {
      if (qrCodeLinked) {
        // Check for units that have a QR code linked
        query.unitQrCode = { $ne: null }; // Not null means linked
      } else if (qrCodeLinked === false) {
        // Check for units that do not have a QR code linked
        query.unitQrCode = null; // Null means not linked
      }
    }

    // Unit serial number filter
    if (unitSerialNo) {
      query.unitSerialNo = { $regex: unitSerialNo, $options: "i" };
    }

    // Filter by next maintenance date (only year and month match)
    if (unitNextMaintenanceDate) {
      const [year, month] = unitNextMaintenanceDate.split("-");
      const nextMonth = parseInt(month, 10) + 1;

      // Set start and end dates for the range, adjusting for year if next month goes to January.
      const startDate = new Date(`${year}-${month}-01`);
      const endDate =
        nextMonth > 12
          ? new Date(`${parseInt(year, 10) + 1}-01-01`) // January of the next year
          : new Date(`${year}-${String(nextMonth).padStart(2, "0")}-01`); // Next month

      query.unitNextMaintenanceDate = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    // Sort order
    const sort = {};
    if (orderBy === UNIT_ORDER_BY.QR_CODE) {
      sort["unitQrCode"] = -1;
      sort["qrCode.qrCodeName"] = 1; // Sort by QR code in ascending order
    } else {
      sort.unitNextMaintenanceDate = -1; // Sort by next maintenance date in ascending order
    }

    // MongoDB aggregation pipeline
    const units = await Unit.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "customers", // Customer collection
          as: "customer",
          let: { customerId: "$unitCustomerId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$customerId"] }, // Match unit ID
                ...(isValidString(customerName) && {
                  customerName: {
                    $regex: customerName,
                    $options: "i",
                  },
                }),
                ...(isValidString(customerMobileNumber) && {
                  "customerTel.mobile": {
                    $regex: customerMobileNumber,
                    $options: "i",
                  },
                }),
              },
            },
          ],
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $lookup: {
          from: "qrcodes",
          as: "qrCode",
          let: { code_id: "$unitQrCode" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$code_id"] }, // Match unit ID
                ...(isValidString(qrCode) && {
                  qrCodeName: {
                    $regex: qrCode,
                    $options: "i",
                  },
                }),
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$qrCode",
          preserveNullAndEmptyArrays: isValidString(qrCode) ? false : true,
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination
    const totalCount = await Unit.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "customers", // Customer collection
          as: "customer",
          let: { customerId: "$unitCustomerId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$customerId"] }, // Match unit ID
                ...(isValidString(customerName) && {
                  customerName: {
                    $regex: customerName,
                    $options: "i",
                  },
                }),
                ...(isValidString(customerMobileNumber) && {
                  "customerTel.mobile": {
                    $regex: customerMobileNumber,
                    $options: "i",
                  },
                }),
              },
            },
          ],
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $lookup: {
          from: "qrcodes",
          as: "qrCode",
          let: { code_id: "$unitQrCode" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$code_id"] }, // Match unit ID
                ...(isValidString(qrCode) && {
                  "unitQrCode.qrCodeName": {
                    $regex: qrCode,
                    $options: "i",
                  },
                }),
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$qrCode",
          preserveNullAndEmptyArrays: isValidString(qrCode) ? false : true,
        },
      },
      {
        $count: "totalCount",
      },
    ]);

    const count = totalCount.length > 0 ? totalCount[0].totalCount : 0;

    return res.status(httpStatus.OK).json(
      ApiResponse.response(customer_success_code, success_message, {
        units,
        page,
        totalCount: count,
        totalPages: Math.ceil(totalCount / limit),
      }),
    );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getDueUnitsExcelDonwloadController = async (req, res) => {
  const { type = "all" } = req.query;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let dateFilter = {};

  switch (type) {
    case "missed":
      dateFilter = {
        unitNextMaintenanceDate: { $lt: now },
      };
      break;

    case "upcoming":
      dateFilter = {
        unitNextMaintenanceDate: {
          $gte: now,
        },
      };
      break;

    case "all":
      break;
    default:
      break;
  }
  try {
    const data = await Unit.find(dateFilter)
      .populate("unitCustomerId")
      .populate("unitQrCode")
      .sort({ unitNextMaintenanceDate: -1 });

    // Create a new Excel workbook and sheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Sheet");

    // Define columns for the Excel sheet
    const columns = [
      { header: "Customer Name", key: "customerName" },
      { header: "Last Maintainence Date", key: "unitLastMaintenanceDate" },
      { header: "Next Service Date", key: "unitNextMaintenanceDate" },
      { header: "Customer Address", key: "customerAddress" },
      { header: "Customer Mobile", key: "customerMobile" },
      { header: "Unit Brand", key: "unitBrand" },
      { header: "Unit Model", key: "unitModel" },
      { header: "Unit Serial No", key: "unitSerialNo" },
      { header: "Installed Date", key: "unitInstalledDate" },
      { header: "QR Code", key: "qrCodeName" },
      // Add more columns based on your database schema
    ];

    // Set columns to worksheet
    worksheet.columns = columns;

    // Add rows to the worksheet
    data.forEach((item) => {
      worksheet.addRow({
        customerName: item.unitCustomerId
          ? item.unitCustomerId.customerName
          : " - ",
        unitLastMaintenanceDate: item.unitLastMaintenanceDate
          ? new Date(item.unitLastMaintenanceDate).toLocaleDateString("en-US")
          : " - ",
        unitNextMaintenanceDate: item.unitNextMaintenanceDate
          ? new Date(item.unitNextMaintenanceDate).toLocaleDateString("en-US")
          : " - ",
        customerAddress: item.unitCustomerId
          ? item.unitCustomerId.customerAddress
          : " - ",
        customerMobile: item.unitCustomerId
          ? item.unitCustomerId.customerTel.mobile
          : " - ",
        unitBrand: item.unitBrand,
        unitModel: item.unitModel,
        unitSerialNo: item.unitSerialNo,
        unitInstalledDate: item.unitInstalledDate
          ? new Date(item.unitInstalledDate).toLocaleDateString("en-US")
          : " - ",
        qrCodeName: item.unitQrCode ? item.unitQrCode.qrCodeName : " - ",
      });
    });

    // Auto-adjust column widths based on the longest cell in each column
    worksheet.columns.forEach((column) => {
      let maxLength = 10; // Set a minimum width for each column

      // Iterate through each row in the column to find the longest content
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, cellValue.length);
      });

      // Adjust column width based on maxLength
      column.width = maxLength + 2; // Add padding for better visibility
    });

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=DataSheet.xlsx");

    // Write the workbook to the response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
