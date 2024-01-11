import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import ApiResponse from "../services/ApiResponse.js";
import {
  bad_request_code,
  customer_error_code,
  workorder_error_code,
  workorder_success_code,
} from "../constants/statusCodes.js";
import Unit from "../models/dao/unitModel.js";
import {
  customer_not_found,
  customer_unit_not_found,
  employee_not_found,
  success_message,
  workOrder_assignees_required,
  workOrder_completed,
  workOrder_empty_images,
  workOrder_not_found,
  workOrder_not_scheduled,
} from "../constants/messageConstants.js";
import { Image, WorkOrder } from "../models/dao/workOrderModel.js";
import { WorkOrderUpdateSchema } from "../schemas/workOrderUpdateSchema.js";
import { generateWorkOrderNumber } from "../services/commonServices.js";
import Customer from "../models/dao/customerModel.js";
import {
  COMPLETED_STATUS,
  CREATED_STATUS,
  SCHEDULED_STATUS,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";
import { WorkOrderAssignSchema } from "../schemas/woAssignEmployeeSchema.js";
import {
  deleteDriveFileAdmin,
  uploadImagesToDrive,
} from "../services/googleApi.js";
import Employee from "../models/dao/employeeModel.js";
import { ADMIN_ROLE } from "../constants/role.js";
import { WorkOrderAddSchema } from "../schemas/WorkOrderAddSchema.js";

export const createRepairJob = async (req, res) => {
  try {
    const { error, value } = WorkOrderAddSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { workOrderType, workOrderUnit, workOrderScheduledDate } = value;

    const unit = await Unit.findById(new ObjectId(workOrderUnit));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, customer_unit_not_found));
    }

    const customer = await Customer.findById(new ObjectId(unit.unitCustomerId));

    if (!customer) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, customer_not_found));
    }

    const code = generateWorkOrderNumber(
      customer.customerName,
      unit.unitSerialNo,
      workOrderType,
      new Date(workOrderScheduledDate)
    );

    const newJob = new WorkOrder({
      workOrderType: workOrderType,
      workOrderCode: code,
      workOrderCustomerId: customer._id,
      workOrderUnitReference: unit._id,
      workOrderScheduledDate: new Date(workOrderScheduledDate),
    });

    await newJob.save();

    return res
      .status(httpStatus.CREATED)
      .json(ApiResponse.response(workorder_success_code, success_message));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const GetWorkOrdersByUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findById(new ObjectId(id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    const workOrders = await WorkOrder.find({
      workOrderUnitReference: new ObjectId(unit._id),
    });

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(
          workorder_success_code,
          success_message,
          workOrders
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getDetailsOfWorkOrderWithPopulated = async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await WorkOrder.findById(new ObjectId(id))
      .populate("workOrderCustomerId")
      .populate("workOrderUnitReference")
      .populate({
        path: "workOrderAssignedEmployees",
        select: "_id userFullName userRole", // Specify the fields you want to retrieve
      })
      .populate("workOrderImages.imageUploadedBy");

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_found));
    }

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(workorder_success_code, success_message, workOrder)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const updateWorkOrderDetails = async (req, res) => {
  try {
    const { error, value } = WorkOrderUpdateSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const {
      _id,
      workOrderType,
      workOrderScheduledDate,
      workOrderInvoiceNumber,
    } = value;

    const workOrder = await WorkOrder.findById(new ObjectId(_id));

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    if (workOrder.workOrderScheduledDate != workOrderScheduledDate) {
      const unit = await Unit.findById(
        new ObjectId(workOrder.workOrderUnitReference)
      );

      if (workOrder.workOrderType === WORK_ORD_SERVICE) {
        unit.unitNextMaintenanceDate = workOrderScheduledDate;
        await unit.save();
      }

      const customer = await Customer.findById(
        new ObjectId(workOrder.workOrderCustomerId)
      );

      workOrder.workOrderCode = generateWorkOrderNumber(
        customer.customerName,
        unit.unitSerialNo,
        workOrder.workOrderType,
        workOrderScheduledDate
      );
    }

    if (workOrder.workOrderStatus === CREATED_STATUS) {
      workOrder.workOrderType = workOrderType;
    }

    if (
      workOrder.workOrderStatus !== CREATED_STATUS &&
      workOrderInvoiceNumber
    ) {
      workOrder.workOrderInvoiceNumber = workOrderInvoiceNumber;
    }

    workOrder.workOrderScheduledDate = workOrderScheduledDate;

    await workOrder.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(workorder_success_code, success_message));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const workOrderAssign = async (req, res) => {
  try {
    const { error, value } = WorkOrderAssignSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { id, workOrderAssignedEmployees } = value;

    const workOrder = await WorkOrder.findById(new ObjectId(id));

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    if (workOrderAssignedEmployees.length === 0) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          ApiResponse.error(bad_request_code, workOrder_assignees_required)
        );
    }

    if (workOrder.workOrderStatus != SCHEDULED_STATUS) {
      workOrder.workOrderStatus = SCHEDULED_STATUS;
    }

    const employeeIds = workOrderAssignedEmployees.map(
      (employee) => employee._id
    );

    workOrder.workOrderAssignedEmployees = employeeIds;
    workOrder.workOrderStatus = SCHEDULED_STATUS;

    await workOrder.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(workorder_success_code, success_message));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const workOrderCompleteState = async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await WorkOrder.findById(new ObjectId(id));

    if (workOrder.workOrderStatus === CREATED_STATUS) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_scheduled));
    }

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    workOrder.workOrderStatus = COMPLETED_STATUS;
    workOrder.workOrderCompletedDate = new Date();

    await workOrder.save();

    const unit = await Unit.findById(
      new ObjectId(workOrder.workOrderUnitReference)
    );

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, customer_unit_not_found));
    }

    unit.unitLastMaintenanceDate = new Date();
    // After 3 months the next service
    unit.unitNextMaintenanceDate = new Date().setMonth(
      new Date().getMonth() + 3
    );

    const savedUnit = await unit.save();

    const customer = await Customer.findById(
      new ObjectId(workOrder.workOrderCustomerId)
    );

    const newCode = generateWorkOrderNumber(
      customer.customerName,
      savedUnit.unitSerialNo,
      WORK_ORD_SERVICE,
      savedUnit.unitNextMaintenanceDate
    );

    const newWorkOrder = new WorkOrder({
      workOrderCode: newCode,
      workOrderScheduledDate: savedUnit.unitNextMaintenanceDate,
      workOrderCustomerId: customer._id,
      workOrderType: WORK_ORD_SERVICE,
      workOrderUnitReference: savedUnit._id,
    });

    await newWorkOrder.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(workorder_success_code, workOrder_completed));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const uploadWorkImages = async (req, res) => {
  try {
    const files = req.files;
    const { id } = req.params;

    if (!files) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_empty_images));
    }

    const employee = await Employee.findById(new ObjectId(req.user.id));

    if (!employee) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, employee_not_found));
    }

    const workOrder = await WorkOrder.findById(new ObjectId(id));

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    const unit = await Unit.findById(
      new ObjectId(workOrder.workOrderUnitReference)
    );

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, customer_unit_not_found));
    }

    const customer = await Customer.findById(
      new ObjectId(workOrder.workOrderCustomerId)
    );

    if (!customer) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, customer_not_found));
    }

    const uploadedFiles = await uploadImagesToDrive(
      files,
      customer.customerName,
      unit.unitSerialNo,
      workOrder.workOrderCode
    );

    const images = [];

    for (const file of uploadedFiles) {
      images.push(
        new Image({
          imageUploadedBy: employee._id,
          imageId: file.id,
          imageFileName: file.fileName,
          imageMimeType: file.mimeType,
          imageWebUrl: file.publicUrl,
          imageContentUrl: file.contentUrl,
        })
      );
    }

    if (images.length != 0) {
      workOrder.workOrderImages = workOrder.workOrderImages.concat(images);

      await workOrder.save();
    }

    res
      .status(200)
      .json(ApiResponse.response(workorder_success_code, success_message));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const getEmployeeAssignedWorkOverview = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await Employee.findById(new ObjectId(employeeId));

    if (!employee) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, employee_not_found));
    }

    let result;

    if (employee.userRole === ADMIN_ROLE) {
      result = await WorkOrder.find({
        workOrderStatus: SCHEDULED_STATUS,
      })
        .populate("workOrderCustomerId")
        .populate("workOrderUnitReference")
        .sort({ workOrderScheduledDate: 1 });
    } else {
      result = await WorkOrder.find({
        workOrderAssignedEmployees: new ObjectId(employeeId),
        workOrderStatus: SCHEDULED_STATUS,
      })
        .populate("workOrderCustomerId")
        .populate("workOrderUnitReference")
        .sort({ workOrderScheduledDate: 1 });
    }

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(workorder_success_code, success_message, result)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Temporary API to delete google drive files
export const deleteFileApi = async (req, res) => {
  const { id } = req.params;

  await deleteDriveFileAdmin(id);

  return res.status(httpStatus.OK).json({ message: "Success" });
};
