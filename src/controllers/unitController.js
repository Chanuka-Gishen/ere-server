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
import Unit from "../models/dao/unitModel.js";
import Customer from "../models/dao/customerModel.js";
import {
  customer_not_found,
  customer_unit_added,
  customer_unit_not_found,
  customer_unit_updated,
  qr_code_name_missing,
  qr_not_available,
  qr_not_found,
  qr_removed,
  success_message,
} from "../constants/messageConstants.js";
import { unitUpdateSchema } from "../schemas/unitUpdateSchema.js";
import { WorkOrder } from "../models/dao/workOrderModel.js";
import {
  INSTALLATION_SEQ,
  SERVICE_SEQ,
  WORK_ORD_INSTALLATION,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";
import { generateWorkOrderNumber } from "../services/commonServices.js";
import { getSequenceValue, updateSequenceValue } from "./sequenceController.js";
import { unitDetailsUpdateSchema } from "../schemas/unitDetailsUpdateSchema.js";
import { QRCodeModel } from "../models/dao/qrCodeModel.js";
import { unitUpdateQrSchema } from "../schemas/unitUpdateQrSchema.js";

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
      unitIsInstalled,
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

    const unit = await newUnit.save();

    const sequenceType = unitIsInstalled ? SERVICE_SEQ : INSTALLATION_SEQ;

    await updateSequenceValue(sequenceType);

    const sequenceValue = await getSequenceValue(sequenceType);

    const workCorderCode = generateWorkOrderNumber(sequenceType, sequenceValue);

    const newWorkOrder = new WorkOrder({
      workOrderCode: workCorderCode,
      workOrderType: unitIsInstalled ? WORK_ORD_SERVICE : WORK_ORD_INSTALLATION,
      workOrderCustomerId: customer._id,
      workOrderUnitReference: unit._id,
      workOrderScheduledDate: unit.unitNextMaintenanceDate,
    });

    await newWorkOrder.save();

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

    if (
      unit.unitSerialNo != unitSerialNo ||
      unit.unitNextMaintenanceDate != unitNextMaintenanceDate
    ) {
      const customer = await Customer.findById(
        new ObjectId(unit.unitCustomerId)
      );

      const workOrders = await WorkOrder.aggregate([
        { $match: { workOrderUnitReference: new ObjectId(unit._id) } },
        { $sort: { workOrderScheduledDate: -1 } }, // Sort in descending order by scheduled date
        { $limit: 1 },
      ]);

      const latestWorkOrder = workOrders[0];

      await WorkOrder.updateOne(
        { _id: latestWorkOrder._id },
        { $set: { workOrderScheduledDate: unitNextMaintenanceDate } }
      );
    }

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
    }).populate("unitQrCode");

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
