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
import Unit from "../models/dao/unitModel.js";
import {
  customer_not_found,
  customer_unit_not_found,
  employee_not_found,
  success_message,
  workOrder_assignees_required,
  workOrder_cannot_update_assignees,
  workOrder_chargers_updated,
  workOrder_completed,
  workOrder_deleted,
  workOrder_empty_images,
  workOrder_images_missing,
  workOrder_invoice_not_created,
  workOrder_not_assigned,
  workOrder_not_found,
  workOrder_not_scheduled,
  workOrder_tip_missing,
} from "../constants/messageConstants.js";
import { ImageModel, WorkOrder } from "../models/dao/workOrderModel.js";
import { WorkOrderUpdateSchema } from "../schemas/workOrderUpdateSchema.js";
import {
  divideSalaryAmongEmployees,
  generateInvoiceNumber,
  generateWorkOrderNumber,
  getSequenceType,
} from "../services/commonServices.js";
import Customer from "../models/dao/customerModel.js";
import {
  CMP_ERE,
  CMP_SINGER,
  COMPLETED_STATUS,
  CREATED_STATUS,
  INVOICE_SEQUENCE,
  SCHEDULED_STATUS,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";
import { WorkOrderAssignSchema } from "../schemas/woAssignEmployeeSchema.js";
import {
  deleteDriveFilesAdmin,
  uploadImagesToDrive,
} from "../services/googleApi.js";
import Employee from "../models/dao/employeeModel.js";
import { ADMIN_ROLE, HELPER_ROLE, TECHNICIAN_ROLE } from "../constants/role.js";
import { WorkOrderAddSchema } from "../schemas/WorkOrderAddSchema.js";
import { getSequenceValue, updateSequenceValue } from "./sequenceController.js";
import { generateInvoicePDF } from "../services/pdfServices.js";
import PDFDocument from "pdfkit";

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

    const code = generateWorkOrderNumber(sequenceType, sequenceValue);

    const newJob = new WorkOrder({
      workOrderType: workOrderType,
      workOrderCode: code,
      workOrderCustomerId: customer._id,
      workOrderUnitReference: unit._id,
      workOrderFrom: workOrderFrom,
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
      workOrderType,
      workOrderScheduledDate,
      workOrderFrom,
      workOrderInvoiceNumber,
    } = value;

    const workOrder = await WorkOrder.findById(new ObjectId(_id));

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(bad_request_code, workOrder_not_found));
    }

    if (workOrder.workOrderFrom === CMP_SINGER) {
      workOrder.workOrderInvoiceNumber = workOrderInvoiceNumber;
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
        sequenceValue
      );

      workOrder.workOrderType = workOrderType;
    }

    if (workOrder.workOrderStatus === CREATED_STATUS) {
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

    await WorkOrder.deleteOne(job);

    const unit = await Unit.findById(new ObjectId(job.workOrderUnitReference));

    const workOrders = await WorkOrder.find({
      workOrderUnitReference: new ObjectId(job.workOrderUnitReference),
    });

    if (workOrders.length === 0) {
      unit.unitLastMaintenanceDate = null;
      unit.unitNextMaintenanceDate = null;

      await unit.save();
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

    const workOrder = await WorkOrder.findById(new ObjectId(id));

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

    workOrder.workOrderStatus = COMPLETED_STATUS;
    workOrder.workOrderCompletedDate = new Date();

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
    const jobs = await WorkOrder.find()
      .sort({ workOrderScheduledDate: 1 })
      .populate("workOrderCustomerId")
      .populate("workOrderUnitReference");

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(workorder_success_code, success_message, jobs)
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

    const unit = await Unit.findById(new ObjectId(id));

    if (!unit) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(customer_error_code, customer_unit_not_found));
    }

    const workOrders = await WorkOrder.aggregate([
      {
        $match: { workOrderUnitReference: new ObjectId(unit._id) },
      },
      {
        $facet: {
          created: [
            { $match: { workOrderStatus: CREATED_STATUS } },
            { $sort: { workOrderScheduledDate: 1 } },
          ],
          completed: [
            { $match: { workOrderStatus: COMPLETED_STATUS } },
            { $sort: { workOrderScheduledDate: 1 } },
          ],
        },
      },
      {
        $project: {
          workOrders: {
            $concatArrays: ["$created", "$completed"],
          },
        },
      },
      {
        $unwind: "$workOrders",
      },
      {
        $replaceRoot: { newRoot: "$workOrders" },
      },
    ]);

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

// Assign Employees To Work Order
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

    if (workOrder.workOrderStatus === COMPLETED_STATUS) {
      return res
        .status(httpStatus.PRECONDITION_FAILED)
        .json(
          ApiResponse.error(bad_request_code, workOrder_cannot_update_assignees)
        );
    }

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
        .sort({ workOrderScheduledDate: 1 });
    } else {
      result = await WorkOrder.find({
        "workOrderAssignedEmployees.employee": new ObjectId(employeeId),
        workOrderStatus: CREATED_STATUS,
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

// Add / Update Work Order Invoice
export const addUpdateWorkOrderChargers = async (req, res) => {
  try {
    const id = req.body.id;
    const data = req.body.chargers;

    const workOrder = await WorkOrder.findById(new ObjectId(id));

    if (!workOrder) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_found));
    }

    if (
      !workOrder.workOrderInvoiceNumber &&
      workOrder.workOrderFrom === CMP_ERE
    ) {
      await updateSequenceValue(INVOICE_SEQUENCE);
      const sequenceValue = await getSequenceValue(INVOICE_SEQUENCE);

      workOrder.workOrderInvoiceNumber = generateInvoiceNumber(sequenceValue);
    }

    const {
      items,
      serviceCharges,
      labourCharges,
      transportCharges,
      otherCharges,
    } = data;

    // Calculate the sum of item costs
    const itemsTotal = items.reduce(
      (total, item) =>
        total +
        (parseFloat(item.itemQty) || 0) *
          (parseFloat(item.itemGrossPrice) || 0),
      0
    );

    const itemsNetTotal = items.reduce(
      (total, item) =>
        total +
        (parseFloat(item.itemQty) || 0) * (parseFloat(item.itemNetPrice) || 0),
      0
    );

    // Calculate the total of additional charges
    const additionalChargesTotal =
      (parseFloat(serviceCharges?.amount) || 0) +
      (parseFloat(labourCharges?.amount) || 0) +
      (parseFloat(transportCharges?.amount) || 0) +
      (parseFloat(otherCharges?.amount) || 0);

    // Calculate the total of additional chargers net amount
    const additionalChargesNetTotal =
      (parseFloat(serviceCharges?.netAmount) || 0) +
      (parseFloat(labourCharges?.netAmount) || 0) +
      (parseFloat(transportCharges?.netAmount) || 0) +
      (parseFloat(otherCharges?.netAmount) || 0);

    // Calculate the grand total
    const grandTotal = itemsTotal + additionalChargesTotal;
    const grandNetTotal = itemsNetTotal + additionalChargesNetTotal;

    workOrder.workOrderChargers = {
      ...data,
      grandNetTotal: grandNetTotal,
      grandTotal: grandTotal,
    };

    await workOrder.save();

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(workorder_success_code, workOrder_chargers_updated)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get invoice download file
export const downloadInvoice = async (req, res) => {
  try {
    const { invoiceNo } = req.params;

    const workOrder = await WorkOrder.findOne({
      workOrderInvoiceNumber: invoiceNo,
    })
      .populate("workOrderCustomerId")
      .populate("workOrderUnitReference");

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          ApiResponse.error(workorder_error_code, workOrder_invoice_not_created)
        );
    }

    // Create a new PDF document
    const doc = new PDFDocument({ bufferPages: true, size: "A4", margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${workOrder.workOrderInvoiceNumber}.pdf`
    );

    // Stream the PDF buffer to the response
    doc.pipe(res);

    generateInvoicePDF(
      doc,
      workOrder.workOrderCustomerId,
      workOrder.workOrderUnitReference,
      workOrder,
      workOrder.workOrderChargers
    );

    doc.end();
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const filteredDate = req.body.filteredDate;

    const pipeline = [
      {
        $match: {
          workOrderStatus: COMPLETED_STATUS,
          workOrderInvoiceNumber: { $ne: null },
          workOrderChargers: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "workOrderCustomerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $group: {
          _id: "$_id",
          workOrderCode: { $first: "$workOrderCode" },
          workOrderFrom: { $first: "$workOrderFrom" },
          workOrderInvoiceNumber: { $first: "$workOrderInvoiceNumber" },
          customer: { $first: { $arrayElemAt: ["$customer", 0] } },
          workOrderCompletedDate: { $first: "$workOrderCompletedDate" },
          totalNetItemPrice: { $sum: "$workOrderChargers.items.itemNetPrice" },
          totalGrossItemPrice: {
            $sum: "$workOrderChargers.items.itemGrossPrice",
          },
          serviceCharges: { $first: "$workOrderChargers.serviceCharges" },
          labourCharges: { $first: "$workOrderChargers.labourCharges" },
          transportCharges: { $first: "$workOrderChargers.transportCharges" },
          otherCharges: { $first: "$workOrderChargers.otherCharges" },
          grandNetTotal: { $first: "$workOrderChargers.grandNetTotal" },
          grandTotal: { $first: "$workOrderChargers.grandTotal" },
        },
      },
      {
        $sort: {
          workOrderCompletedDate: 1,
        },
      },
    ];

    if (filteredDate) {
      const date = new Date(filteredDate);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      pipeline[0].$match.workOrderCompletedDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const result = await WorkOrder.aggregate(pipeline);

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

// Get total net cost and gross cost
export const getTotalCostStats = async (req, res) => {
  try {
    const filteredDate = req.body.filteredDate;

    const pipeline = [
      {
        $match: {
          workOrderStatus: COMPLETED_STATUS,
          workOrderInvoiceNumber: { $ne: null },
          "workOrderChargers.grandNetTotal": { $exists: true },
          "workOrderChargers.grandTotal": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          NetTotal: { $sum: "$workOrderChargers.grandNetTotal" },
          total: { $sum: "$workOrderChargers.grandTotal" },
        },
      },
    ];

    if (filteredDate) {
      const date = new Date(filteredDate);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      pipeline[0].$match.workOrderCompletedDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const result = await WorkOrder.aggregate(pipeline);

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(workorder_success_code, success_message, result[0])
      );
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
