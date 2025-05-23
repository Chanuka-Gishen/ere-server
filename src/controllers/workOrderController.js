import httpStatus from "http-status";
import { ObjectId } from "mongodb";
import ApiResponse from "../services/ApiResponse.js";
import {
  bad_request_code,
  customer_error_code,
  workorder_error_code,
  workorder_success_code,
  workorder_warning_code,
} from "../constants/statusCodes.js";

import Unit from "../models/unitModel.js";
import { ImageModel, WorkOrder } from "../models/workOrderModel.js";
import Customer from "../models/customerModel.js";
import Employee from "../models/employeeModel.js";
import { InvoiceModel } from "../models/invoiceModel.js";

import {
  customer_not_found,
  customer_unit_not_found,
  employee_not_found,
  invoice_should_close_first,
  success_message,
  workOrder_assignees_required,
  workOrder_completed,
  workOrder_deleted,
  workOrder_empty_images,
  workOrder_images_missing,
  workOrder_not_assigned,
  workOrder_not_found,
  workOrder_tip_missing,
} from "../constants/messageConstants.js";
import { WorkOrderUpdateSchema } from "../schemas/workOrderUpdateSchema.js";
import {
  divideSalaryAmongEmployees,
  generateWorkOrderNumber,
  getSequenceType,
  isValidString,
  updateDateInWorkOrderCode,
} from "../services/commonServices.js";
import {
  CMP_SINGER,
  CMP_SINHAGIRI,
  COMPLETED_STATUS,
  CREATED_STATUS,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";
import { WorkOrderAssignSchema } from "../schemas/woAssignEmployeeSchema.js";
import {
  deleteDriveFilesAdmin,
  uploadImagesToDrive,
} from "../services/googleApi.js";
import { ADMIN_ROLE, HELPER_ROLE, TECHNICIAN_ROLE } from "../constants/role.js";
import { WorkOrderAddSchema } from "../schemas/WorkOrderAddSchema.js";
import { getSequenceValue, updateSequenceValue } from "./sequenceController.js";
import { jobLinkListFilterSchema } from "../schemas/jobLinkListFilterSchema.js";
import { INV_CREATED } from "../constants/inoviceStatus.js";

// Create New Job
export const createJob = async (req, res) => {
  try {
    const { error, value } = WorkOrderAddSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const {
      workOrderType,
      workOrderUnit,
      workOrderScheduledDate,
      workOrderFrom,
    } = value;

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

    const sequenceType = getSequenceType(workOrderType);

    await updateSequenceValue(sequenceType);

    const sequenceValue = await getSequenceValue(sequenceType);

    const code = generateWorkOrderNumber(
      sequenceType,
      sequenceValue,
      workOrderScheduledDate
    );

    const newJob = new WorkOrder({
      workOrderType: workOrderType,
      workOrderCode: code,
      workOrderCustomerId: customer._id,
      workOrderUnitReference: unit._id,
      workOrderFrom: workOrderFrom,
      workOrderScheduledDate: new Date(workOrderScheduledDate),
    });

    const savedJob = await newJob.save();

    const newInvoice = new InvoiceModel({
      invoiceLinkedWorkOrder: new ObjectId(savedJob._id),
      invoiceLinkedCustomer: new ObjectId(savedJob.workOrderCustomerId),
      invoiceLinkedUnit: new ObjectId(savedJob.workOrderUnitReference),
      invoiceStatus: INV_CREATED,
    });

    const savedInvoice = await newInvoice.save();

    savedJob.workOrderInvoice = new ObjectId(savedInvoice._id);

    await savedJob.save();

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

// Update Work Order Details
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
      workOrderCodeSub,
      workOrderType,
      workOrderScheduledDate,
      workOrderFrom,
      workOrderInvoiceNumber,
      workOrderLinkedJobs,
    } = value;

    const workOrder = await WorkOrder.findById(new ObjectId(_id));

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    let mainInvoiceNo = null;

    //-----------------------Update Invoices-------------------------

    const isNewLinkedJobs =
      workOrder.workOrderLinked.length < workOrderLinkedJobs.length;
    const isDeletedJobs =
      workOrder.workOrderLinked.length > workOrderLinkedJobs.length;

    const linkedObjectIds = workOrderLinkedJobs.map(
      (job) => new ObjectId(job._id)
    );

    if (isNewLinkedJobs && workOrder.workOrderLinked.length > 0) {
      const existingObjectIds = workOrder.workOrderLinked.map(
        (id) => new ObjectId(id)
      );

      const invoicesList = await InvoiceModel.find({
        invoiceLinkedWorkOrder: { $in: existingObjectIds },
      });

      // Extract the invoiceNo fields
      const invoiceNumbers = invoicesList.map(
        (invoice) => invoice.invoiceNumber
      );

      // Calculate the most repetitive value
      const frequencyMap = {};

      invoiceNumbers.forEach((value) => {
        if (value !== null) {
          frequencyMap[value] = (frequencyMap[value] || 0) + 1;
        }
      });

      const mostRepetitiveValue = Object.keys(frequencyMap).reduce((a, b) =>
        frequencyMap[a] > frequencyMap[b] ? a : b
      );

      mainInvoiceNo = mostRepetitiveValue;

      await InvoiceModel.updateMany(
        { invoiceLinkedWorkOrder: { $in: linkedObjectIds } },
        { $set: { invoiceNumber: mainInvoiceNo } }
      );
    }

    if (isDeletedJobs) {
      const deletedIds = workOrder.workOrderLinked.filter(
        (id) => !linkedObjectIds.includes(id)
      );

      const deletedObjIds = deletedIds.map((id) => new ObjectId(id));

      await InvoiceModel.updateMany(
        { invoiceLinkedWorkOrder: { $in: deletedObjIds } },
        { $set: { invoiceNumber: null, invoiceStatus: INV_CREATED } }
      );
    }

    await WorkOrder.updateMany(
      { _id: { $in: linkedObjectIds } },
      {
        $set: {
          workOrderLinked: linkedObjectIds,
          workOrderLinkedInvoiceNo: null,
        },
      }
    );

    //---------------------------------------------------------------

    // Add Sub Job Number
    if ([CMP_SINGER, CMP_SINHAGIRI].includes(workOrderFrom)) {
      workOrder.workOrderCodeSub = workOrderCodeSub;
    }

    if (
      workOrder.workOrderFrom === CMP_SINGER ||
      workOrder.workOrderFrom === CMP_SINHAGIRI
    ) {
      if (workOrder.workOrderInvoice) {
        const invoice = await InvoiceModel.findById(
          new ObjectId(workOrder.workOrderInvoice)
        );

        invoice.invoiceNumber = workOrderInvoiceNumber;

        await invoice.save();
      } else {
        const newInvoice = new InvoiceModel({
          invoiceNumber: workOrderInvoiceNumber,
          invoiceLinkedWorkOrder: new ObjectId(workOrder._id),
          invoiceLinkedCustomer: new ObjectId(workOrder.workOrderCustomerId),
          invoiceLinkedUnit: new ObjectId(workOrder.workOrderUnitReference),
        });

        const savedInvoice = await newInvoice.save();

        workOrder.workOrderInvoice = new ObjectId(savedInvoice._id);
      }
    }

    if (
      workOrder.workOrderStatus === CREATED_STATUS &&
      workOrder.workOrderScheduledDate != workOrderScheduledDate &&
      workOrder.workOrderType === WORK_ORD_SERVICE
    ) {
      const unit = await Unit.findById(
        new ObjectId(workOrder.workOrderUnitReference)
      );

      unit.unitNextMaintenanceDate = workOrderScheduledDate;
      await unit.save();
    }

    if (
      workOrder.workOrderStatus === CREATED_STATUS &&
      workOrder.workOrderType != workOrderType
    ) {
      await updateSequenceValue(getSequenceType(workOrderType));

      const sequenceValue = await getSequenceValue(
        getSequenceType(workOrderType)
      );

      workOrder.workOrderCode = generateWorkOrderNumber(
        getSequenceType(workOrderType),
        sequenceValue,
        workOrderScheduledDate
      );

      workOrder.workOrderType = workOrderType;
    }

    if (workOrder.workOrderStatus === CREATED_STATUS) {
      if (
        workOrder.workOrderScheduledDate != workOrderScheduledDate &&
        workOrder.workOrderType === workOrderType
      ) {
        const parts = workOrder.workOrderCode.split("-");
        workOrder.workOrderCode = updateDateInWorkOrderCode(
          parts[0],
          workOrderScheduledDate,
          parts[2]
        );
      }
      workOrder.workOrderScheduledDate = workOrderScheduledDate;
    }

    workOrder.workOrderFrom = workOrderFrom;

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

// Delete Work Order (if not COMPLETED)
export const deleteWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await WorkOrder.findById(new ObjectId(id));

    if (!job) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    const images = job.workOrderImages;

    if (images.length > 0) {
      const deleteFileIds = images.map((file) => file.imageId);

      await deleteDriveFilesAdmin(deleteFileIds);
    }

    const unit = await Unit.findById(new ObjectId(job.workOrderUnitReference));

    const workOrders = await WorkOrder.find({
      workOrderUnitReference: new ObjectId(job.workOrderUnitReference),
    });

    if (workOrders.length === 0) {
      unit.unitLastMaintenanceDate = null;
      unit.unitNextMaintenanceDate = null;

      await unit.save();
    }

    if (job.workOrderInvoice) {
      const exitingsInvoice = await InvoiceModel.findById(
        new ObjectId(job.workOrderInvoice)
      );
      await InvoiceModel.deleteOne(exitingsInvoice);
    }

    await WorkOrder.deleteOne(job);

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(workorder_success_code, workOrder_deleted));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Change Work Order Status To COMPLETED
export const workOrderCompleteState = async (req, res) => {
  try {
    const { id } = req.params;
    const date = req.body.date;

    const workOrder = await WorkOrder.findById(new ObjectId(id)).populate(
      "workOrderInvoice"
    );

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    if (workOrder.workOrderAssignedEmployees.length === 0) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          ApiResponse.error(workorder_warning_code, workOrder_not_assigned)
        );
    }

    if (workOrder.workOrderInvoice.invoiceStatus === INV_CREATED) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          ApiResponse.error(workorder_warning_code, invoice_should_close_first)
        );
    }

    const completedDate = date ? new Date(date) : new Date();

    workOrder.workOrderStatus = COMPLETED_STATUS;
    workOrder.workOrderCompletedDate = completedDate;

    const savedWorkOrder = await workOrder.save();

    if (savedWorkOrder.workOrderType != WORK_ORD_REPAIR) {
      const unit = await Unit.findById(
        new ObjectId(savedWorkOrder.workOrderUnitReference)
      );

      if (!unit) {
        return res
          .status(httpStatus.NOT_FOUND)
          .json(ApiResponse.error(bad_request_code, customer_unit_not_found));
      }

      unit.unitLastMaintenanceDate =
        savedWorkOrder.workOrderType === WORK_ORD_SERVICE
          ? savedWorkOrder.workOrderCompletedDate
          : null;
      // After 4 months the next service
      unit.unitNextMaintenanceDate = new Date().setMonth(
        new Date().getMonth() + 4
      );

      if (savedWorkOrder.workOrderType === WORK_ORD_INSTALLATION) {
        unit.unitInstalledDate = savedWorkOrder.workOrderCompletedDate;
      }

      await unit.save();
    }

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

// Get all work Orders - Admin
export const getWorkOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const skip = page * limit;

    const filterCustomerName = req.query.customerName;
    const filterCustomerMobile = req.query.customerMobile;
    const filterJobCode = req.query.jobCode;
    const filterQrCode = req.query.qrCode;
    const filterInvoiceNumber = req.query.invoiceNumber;

    const matchConditionsCustomer = {
      $expr: { $eq: ["$_id", "$$customerId"] }, // Always match on customer ID
    };

    // Add condition for customerName if it's valid
    if (isValidString(filterCustomerName)) {
      matchConditionsCustomer.customerName = {
        $regex: `${filterCustomerName}`,
        $options: "i", // Add case-insensitive option if needed
      };
    }

    // Add condition for customerTel.mobile if it's valid
    if (isValidString(filterCustomerMobile)) {
      matchConditionsCustomer["customerTel.mobile"] = {
        $regex: `${filterCustomerMobile}`,
        $options: "i",
      };
    }

    const pipeline = [
      // Match stage for filtering by job code
      {
        $match: {
          ...(isValidString(filterJobCode) && {
            workOrderCode: {
              $regex: `${filterJobCode}`,
              $options: "i",
            },
          }),
        },
      },
      // Lookup and filter customers
      {
        $lookup: {
          from: "customers",
          let: { customerId: "$workOrderCustomerId" }, // Define variables
          pipeline: [
            {
              $match: matchConditionsCustomer,
            },
          ],
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
        },
      },

      // Lookup and filter units
      {
        $lookup: {
          from: "units",
          as: "unit",
          let: { unitId: "$workOrderUnitReference" }, // Define variables
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$unitId"] }, // Match unit ID
              },
            },
            {
              $lookup: {
                from: "qrcodes",
                as: "unitQrCode",
                let: { qrCodeId: "$unitQrCode" }, // Correctly reference the unitQrCode field from the matched unit
                pipeline: [
                  {
                    $match: {
                      $and: [
                        { $expr: { $eq: ["$_id", "$$qrCodeId"] } },
                        ...(isValidString(filterQrCode)
                          ? [
                              {
                                qrCodeName: {
                                  $regex: `${filterQrCode}`,
                                  $options: "i",
                                },
                              },
                            ]
                          : []),
                      ],
                    },
                  },
                  { $project: { qrCodeName: 1, _id: 0 } }, // Project only qrCodeName
                ],
              },
            },
            {
              $unwind: {
                path: "$unitQrCode",
                preserveNullAndEmptyArrays: isValidString(filterQrCode)
                  ? false
                  : true, // Optional: to keep documents without a QR
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$unit",
        },
      },
      // Lookup invoices
      {
        $lookup: {
          from: "invoices",
          let: { invoiceId: "$workOrderInvoice" }, // Define variables
          pipeline: [
            {
              $match: {
                $and: [
                  { $expr: { $eq: ["$_id", "$$invoiceId"] } }, // Match invoice ID
                  ...(isValidString(filterInvoiceNumber)
                    ? [
                        {
                          invoiceNumber: {
                            $regex: `${filterInvoiceNumber}`,
                            $options: "i",
                          },
                        },
                      ]
                    : []),
                ],
              },
            },
          ],
          as: "invoice",
        },
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: isValidString(filterInvoiceNumber)
            ? false
            : true,
        },
      },
      {
        $sort: { workOrderCreatedAt: -1 },
      },
      // Skip and limit for pagination
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const data = await WorkOrder.aggregate(pipeline);

    const countDocuments = await WorkOrder.aggregate([
      // Match stage for filtering by job code
      {
        $match: {
          ...(isValidString(filterJobCode) && {
            workOrderCode: {
              $regex: `${filterJobCode}`,
              $options: "i",
            },
          }),
        },
      },

      // Lookup and filter customers
      {
        $lookup: {
          from: "customers",
          let: { customerId: "$workOrderCustomerId" }, // Define variables
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$customerId"] }, // Match customer ID
                ...(isValidString(filterCustomerName) && {
                  customerName: {
                    $regex: `${filterCustomerName}`,
                    $options: "i",
                  },
                }),
                ...(isValidString(filterCustomerMobile) && {
                  "customerTel.mobile": {
                    $regex: `^${filterCustomerMobile}`,
                    $options: "i",
                  },
                }),
              },
            },
          ],
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
        },
      },

      // Lookup and filter units
      {
        $lookup: {
          from: "units",
          as: "unit",
          let: { unitId: "$workOrderUnitReference" }, // Define variables
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$unitId"] }, // Match unit ID
              },
            },
            {
              $lookup: {
                from: "qrcodes",
                as: "unitQrCode",
                let: { qrCodeId: "$unitQrCode" }, // Correctly reference the unitQrCode field from the matched unit
                pipeline: [
                  {
                    $match: {
                      $and: [
                        { $expr: { $eq: ["$_id", "$$qrCodeId"] } },
                        ...(isValidString(filterQrCode)
                          ? [
                              {
                                qrCodeName: {
                                  $regex: `${filterQrCode}`,
                                  $options: "i",
                                },
                              },
                            ]
                          : []),
                      ],
                    },
                  },
                  { $project: { qrCodeName: 1, _id: 0 } }, // Project only qrCodeName
                ],
              },
            },
            {
              $unwind: {
                path: "$unitQrCode",
                preserveNullAndEmptyArrays: isValidString(filterQrCode)
                  ? false
                  : true, // Optional: to keep documents without a QR
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$unit",
        },
      },
      // Lookup invoices
      {
        $lookup: {
          from: "invoices",
          let: { invoiceId: "$workOrderInvoice" }, // Define variables
          pipeline: [
            {
              $match: {
                $and: [
                  { $expr: { $eq: ["$_id", "$$invoiceId"] } }, // Match invoice ID
                  ...(isValidString(filterInvoiceNumber)
                    ? [
                        {
                          invoiceNumber: {
                            $regex: `${filterInvoiceNumber}`,
                            $options: "i",
                          },
                        },
                      ]
                    : []),
                ],
              },
            },
          ],
          as: "invoice",
        },
      },
      {
        $unwind: {
          path: "$invoice",
          preserveNullAndEmptyArrays: isValidString(filterInvoiceNumber)
            ? false
            : true,
        },
      },
      {
        $count: "totalCount",
      },
    ]);

    const count = countDocuments.length > 0 ? countDocuments[0].totalCount : 0;

    return res.status(httpStatus.OK).json(
      ApiResponse.response(workorder_success_code, success_message, {
        data,
        count,
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get Work Orders By Customer Unit
export const GetWorkOrdersByUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const skip = page * limit;

    const unit = await Unit.findById(new ObjectId(id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    const data = await WorkOrder.find({
      workOrderUnitReference: new ObjectId(unit._id),
    })
      .populate("workOrderInvoice")
      .sort({ workOrderScheduledDate: 1 })
      .skip(skip)
      .limit(limit);

    const count = await WorkOrder.find({
      workOrderUnitReference: new ObjectId(unit._id),
    });

    return res.status(httpStatus.OK).json(
      ApiResponse.response(workorder_success_code, success_message, {
        data,
        count,
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get Work Order Details - Populated
export const getDetailsOfWorkOrderWithPopulated = async (req, res) => {
  try {
    const { id } = req.params;

    const workOrder = await WorkOrder.findById(new ObjectId(id))
      .populate("workOrderCustomerId")
      .populate({
        path: "workOrderUnitReference",
        populate: {
          path: "unitQrCode",
          model: "QRCode",
        },
      })
      .populate({
        path: "workOrderAssignedEmployees",
        select: "employee tipDetails",
        populate: {
          path: "employee",
          select: "_id userFullName userRole",
        },
      })
      .populate("workOrderImages.imageUploadedBy")
      .populate({
        path: "workOrderLinked",
        select: "_id workOrderCode workOrderType",
      })
      .populate("workOrderInvoice");

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

// Assign Employees To Work Order
export const workOrderAssign = async (req, res) => {
  try {
    const { error, value } = WorkOrderAssignSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { id, workOrderAssignedEmployees, totalTip } = value;

    const workOrder = await WorkOrder.findById(new ObjectId(id));

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    // if (workOrder.workOrderStatus === COMPLETED_STATUS) {
    //   return res
    //     .status(httpStatus.PRECONDITION_FAILED)
    //     .json(
    //       ApiResponse.error(bad_request_code, workOrder_cannot_update_assignees)
    //     );
    // }

    if (workOrderAssignedEmployees.length === 0) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          ApiResponse.error(bad_request_code, workOrder_assignees_required)
        );
    }

    const employeeIds = workOrderAssignedEmployees.map((emp) => ({
      employee: new ObjectId(emp._id),
      tip: {
        amount: 0,
      },
    }));

    workOrder.workOrderAssignedEmployees = employeeIds;

    await workOrder.save();

    if (totalTip > 0) {
      const result = await WorkOrder.findById(new ObjectId(id)).populate({
        path: "workOrderAssignedEmployees",
        select: "employee tip",
        populate: {
          path: "employee",
          select: "_id userFullName userRole",
        },
      });

      const technicianCount = result.workOrderAssignedEmployees.filter(
        (record) => record.employee.userRole === TECHNICIAN_ROLE
      );
      const helperCount = result.workOrderAssignedEmployees.filter(
        (record) => record.employee.userRole === HELPER_ROLE
      );

      const { perTechnicianAmount, perHelperAmount } =
        divideSalaryAmongEmployees(
          technicianCount.length,
          helperCount.length,
          totalTip
        );

      result.workOrderEmployeeTip = totalTip;

      result.workOrderAssignedEmployees.forEach((assignees) => {
        if (assignees.employee.userRole === TECHNICIAN_ROLE) {
          assignees.tip.amount = perTechnicianAmount;
        } else {
          assignees.tip.amount = perHelperAmount;
        }
      });

      await result.save();
    }

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

// Upload Images To Work Order
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
        new ImageModel({
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

// Get Work Order Overview To Employees
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
        workOrderStatus: { $in: [CREATED_STATUS] },
      })
        .populate("workOrderCustomerId")
        .populate("workOrderUnitReference")
        .populate("workOrderInvoice")
        .sort({ workOrderScheduledDate: -1 });
    } else {
      result = await WorkOrder.find({
        "workOrderAssignedEmployees.employee": new ObjectId(employeeId),
        workOrderStatus: CREATED_STATUS,
      })
        .populate("workOrderCustomerId")
        .populate("workOrderUnitReference")
        .populate("workOrderInvoice")
        .sort({ workOrderScheduledDate: -1 });
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

// Update Work Order Employee Tips
export const updateWorkOrderEmployeeTips = async (req, res) => {
  try {
    const { id, amount } = req.body;

    if (!id || !amount || amount < 0) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(workorder_error_code, workOrder_tip_missing));
    }

    const workOrder = await WorkOrder.findById(new ObjectId(id)).populate({
      path: "workOrderAssignedEmployees",
      select: "employee tipDetails",
      populate: {
        path: "employee",
        select: "_id userFullName userRole",
      },
    });

    if (!workOrder) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_found));
    }

    const technicianCount = workOrder.workOrderAssignedEmployees.filter(
      (record) => record.employee.userRole === TECHNICIAN_ROLE
    );
    const helperCount = workOrder.workOrderAssignedEmployees.filter(
      (record) => record.employee.userRole === HELPER_ROLE
    );

    const { perTechnicianAmount, perHelperAmount } = divideSalaryAmongEmployees(
      technicianCount.length,
      helperCount.length,
      amount
    );

    workOrder.workOrderEmployeeTip = amount;

    workOrder.workOrderAssignedEmployees.forEach((assignees) => {
      if (assignees.employee.userRole === TECHNICIAN_ROLE) {
        assignees.tip.amount = perTechnicianAmount;
      } else {
        assignees.tip.amount = perHelperAmount;
      }
    });

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

// Get the today's scheduled work count
export const getTodaysWorkCount = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const countOfTodayWorkOrders = await WorkOrder.countDocuments({
      workOrderScheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(
          workorder_success_code,
          success_message,
          countOfTodayWorkOrders
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Delete files from google drive
export const deleteFilesFromDrive = async (req, res) => {
  try {
    const { idList, workOrderId } = req.body;

    if (!idList || idList.length === 0) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          ApiResponse.error(workorder_error_code, workOrder_images_missing)
        );
    }

    const existingWorkOrder = await WorkOrder.findById(
      new ObjectId(workOrderId)
    );

    if (!existingWorkOrder) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_found));
    }

    const deleteFileIds = idList.map((file) => file.imageId);

    await deleteDriveFilesAdmin(deleteFileIds);

    const deletedImageIds = idList.map((file) => file._id);

    const newImageList = existingWorkOrder.workOrderImages.filter(
      (image) => !deletedImageIds.includes(image._id.toString())
    );

    existingWorkOrder.workOrderImages = newImageList;

    await existingWorkOrder.save();

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

// Get customer workOrder with filtered by sheduled date and customer
export const workOrdersBySheduledDateAndCustomer = async (req, res) => {
  try {
    const { error, value } = jobLinkListFilterSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { customerId, scheduledDate } = value;

    const customer = await Customer.findById(new ObjectId(customerId));

    if (!customer) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, customer_not_found));
    }

    const workOrders = await WorkOrder.find({
      workOrderCustomerId: new ObjectId(customer._id),
      //workOrderStatus: CREATED_STATUS,
    }).populate({
      path: "workOrderLinked",
      select: "_id workOrderCode workOrderType",
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

// Get work orders by assigned employees, filter by date
export const employeeWorkOrdersController = async (req, res) => {
  try {
    const { id } = req.params;

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const { dateFrom, dateTo } = req.query;

    const skip = page * limit;

    const pipeline = [
      {
        $match: {
          "workOrderAssignedEmployees.employee": new ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "workOrderCustomerId",
          foreignField: "_id",
          as: "workOrderCustomerId",
        },
      },
      {
        $lookup: {
          from: "units",
          localField: "workOrderUnitReference",
          foreignField: "_id",
          as: "workOrderUnitReference",
        },
      },
      {
        $lookup: {
          from: "invoices",
          localField: "workOrderInvoice",
          foreignField: "_id",
          as: "workOrderInvoice",
        },
      },
      {
        $unwind: "$workOrderAssignedEmployees",
      },
      {
        $match: {
          "workOrderAssignedEmployees.employee": new ObjectId(id),
        },
      },
      {
        $project: {
          workOrderCode: 1,
          workOrderFrom: 1,
          workOrderCustomerId: { $arrayElemAt: ["$workOrderCustomerId", 0] },
          workOrderScheduledDate: 1,
          workOrderCompletedDate: 1,
          workOrderType: 1,
          workOrderStatus: 1,
          workOrderInvoice: 1,
          workOrderImages: 1,
          workOrderUnitReference: 1,
          workOrderEmployeeTip: "$workOrderAssignedEmployees.tip.amount",
          workOrderLinked: 1,
          workOrderQuotationApproved: 1,
          workOrderCreatedAt: 1,
        },
      },
      {
        $sort: {
          workOrderCompletedDate: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const countPipeline = [
      {
        $match: {
          "workOrderAssignedEmployees.employee": new ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "workOrderCustomerId",
          foreignField: "_id",
          as: "workOrderCustomerId",
        },
      },
      {
        $lookup: {
          from: "units",
          localField: "workOrderUnitReference",
          foreignField: "_id",
          as: "workOrderUnitReference",
        },
      },
      {
        $lookup: {
          from: "invoices",
          localField: "workOrderInvoice",
          foreignField: "_id",
          as: "workOrderInvoice",
        },
      },
      {
        $unwind: "$workOrderAssignedEmployees",
      },
      {
        $match: {
          "workOrderAssignedEmployees.employee": new ObjectId(id),
        },
      },
      {
        $project: {
          workOrderCode: 1,
          workOrderFrom: 1,
          workOrderCustomerId: { $arrayElemAt: ["$workOrderCustomerId", 0] },
          workOrderScheduledDate: 1,
          workOrderCompletedDate: 1,
          workOrderType: 1,
          workOrderStatus: 1,
          workOrderInvoice: 1,
          workOrderImages: 1,
          workOrderUnitReference: 1,
          workOrderEmployeeTip: "$workOrderAssignedEmployees.tip.amount",
          workOrderLinked: 1,
          workOrderQuotationApproved: 1,
          workOrderCreatedAt: 1,
        },
      },
      {
        $count: "totalCount",
      },
    ];

    if (dateFrom && dateTo) {
      const filterDateFrom = new Date(dateFrom);
      const filterDateTo = new Date(dateTo);
      const startOfDay = new Date(filterDateFrom.setHours(0, 0, 0, 0));
      const endOfDay = new Date(filterDateTo.setHours(23, 59, 59, 999));

      pipeline[0].$match = {
        workOrderCompletedDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      };

      countPipeline[0].$match = {
        workOrderCompletedDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      };
    }

    const workOrders = await WorkOrder.aggregate(pipeline);

    const documentCount = await WorkOrder.aggregate(countPipeline);

    return res.status(httpStatus.OK).json(
      ApiResponse.response(workorder_success_code, success_message, {
        workOrders,
        documentCount:
          documentCount.length > 0 ? documentCount[0].totalCount : 0,
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
