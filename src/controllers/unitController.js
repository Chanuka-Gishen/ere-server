import httpStatus from "http-status";
import { ObjectId } from "mongodb";
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
    console.log(error);
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
    console.log(error);
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
          ApiResponse.error(customer_error_code, customer_unit_cannot_delete)
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
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
        ApiResponse.response(customer_success_code, success_message, units)
      );
  } catch (error) {
    console.log(error);
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

    const unit = await Unit.findOne({ unitQrCode: qrCode._id }).populate(
      "unitCustomerId"
    );

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
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get units sorted and group by next maintainence date
export const getUnitsForCalender = async (req, res) => {
  try {
    const units = await Unit.aggregate([
      {
        $match: {
          unitNextMaintenanceDate: { $ne: null },
        },
      },
      {
        $addFields: {
          maintenanceDate: {
            $dateToString: {
              format: "%Y-%m-%d", // Format as YYYY-MM-DD
              date: "$unitNextMaintenanceDate", // Extract parts from this date field
            },
          },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "unitCustomerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $lookup: {
          from: "qrcodes",
          localField: "unitQrCode",
          foreignField: "_id",
          as: "qrCode",
        },
      },
      {
        $group: {
          _id: "$maintenanceDate", // Group by the extracted date parts
          units: {
            $push: {
              $mergeObjects: [
                "$$ROOT",
                {
                  customer: { $arrayElemAt: ["$customer", 0] },
                  qrCode: {
                    $cond: [
                      { $eq: [{ $size: "$qrCode" }, 0] },
                      null,
                      { $arrayElemAt: ["$qrCode", 0] },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    ]);

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
