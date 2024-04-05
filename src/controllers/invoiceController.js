import { ObjectId } from "mongodb";
import httpStatus from "http-status";

import { WorkOrder } from "../models/workOrderModel.js";
import ApiResponse from "../services/ApiResponse.js";
import {
  bad_request_code,
  workorder_error_code,
  workorder_success_code,
} from "../constants/statusCodes.js";
import {
  success_message,
  workOrder_chargers_updated,
  workOrder_not_found,
} from "../constants/messageConstants.js";
import {
  CMP_ERE,
  COMPLETED_STATUS,
  INVOICE_SEQUENCE,
} from "../constants/commonConstants.js";
import { getSequenceValue, updateSequenceValue } from "./sequenceController.js";
import { generateInvoiceNumber } from "../services/commonServices.js";
import { InvoiceModel } from "../models/invoiceModel.js";
import { InvoiceLinkSchema } from "../schemas/invoiceLinkSchema.js";

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

    let invoice;

    if (workOrder.workOrderInvoice) {
      invoice = await InvoiceModel.findById(
        new ObjectId(workOrder.workOrderInvoice)
      );
    } else {
      let invoiceNumber = null;

      if (workOrder.workOrderFrom === CMP_ERE) {
        await updateSequenceValue(INVOICE_SEQUENCE);
        const sequenceValue = await getSequenceValue(INVOICE_SEQUENCE);

        invoiceNumber = generateInvoiceNumber(sequenceValue);
      }

      const newInvoice = new InvoiceModel({
        invoiceNumber,
        invoiceLinkedWorkOrder: new ObjectId(workOrder._id),
        invoiceLinkedCustomer: new ObjectId(workOrder.workOrderCustomerId),
        invoiceLinkedUnit: new ObjectId(workOrder.workOrderUnitReference),
      });

      invoice = await newInvoice.save();

      workOrder.workOrderInvoice = new ObjectId(invoice._id);
      await workOrder.save();
    }

    const {
      items,
      serviceCharges,
      labourCharges,
      transportCharges,
      otherCharges,
      discount,
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

    let invDiscountPerc = discount ? discount.percentage : 0;
    const discountAmount =
      invDiscountPerc === 0 ? 0 : grandTotal * (invDiscountPerc / 100);
    const grandTotalWithDiscount =
      invDiscountPerc === 0
        ? grandTotal
        : parseFloat(grandTotal) - parseFloat(discountAmount);

    console.log(items);

    invoice.items = items;
    invoice.serviceCharges = serviceCharges;
    invoice.labourCharges = labourCharges;
    invoice.transportCharges = transportCharges;
    invoice.otherCharges = otherCharges;
    invoice.discount.percentage = invDiscountPerc;
    invoice.discount.amount = discountAmount;
    invoice.grandNetTotal = grandNetTotal;
    invoice.grandTotal = grandTotalWithDiscount;

    await invoice.save();

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

// Add Update Invoice linked to work orders ------------------------ Refactor this---------------------------
export const updateInvoiceLinkedToContorller = async (req, res) => {
  const { error, value } = InvoiceLinkSchema.validate(req.body);

  if (error) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }

  const { workOrderId, workOrderLinkedJobs } = value;

  const workOrder = await WorkOrder.findById(new ObjectId(workOrderId));

  if (!workOrder) {
    return res
      .status(httpStatus.NOT_FOUND)
      .json(ApiResponse.error(bad_request_code, workOrder_not_found));
  }

  const linkJobIds = workOrderLinkedJobs.map((job) => job._id);
  let invoice;

  if (workOrder.workOrderInvoice) {
    invoice = await InvoiceModel.findById(
      new ObjectId(workOrder.workOrderInvoice)
    );
  } else {
    await updateSequenceValue(INVOICE_SEQUENCE);
    const sequenceValue = await getSequenceValue(INVOICE_SEQUENCE);

    const newInvoice = new InvoiceModel({
      invoiceNumber: generateInvoiceNumber(sequenceValue),
      invoiceLinkedTo: linkJobIds,
    });

    invoice = await newInvoice.save();

    if (linkJobIds.length != 0) {
      for (const id of linkJobIds) {
        const job = await WorkOrder.findById(new ObjectId(id));
        job.workOrderInvoice = invoice._id;

        await job.save();
      }
    }

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(workorder_success_code, success_message));
  }

  // Get the current list of workOrderIds linked to the invoice
  const currentWorkOrderIds = invoice.invoiceLinkedTo.map((id) =>
    id.toString()
  );

  // Find newly added workOrderIds
  const newWorkOrderIds = workOrderLinkedJobs.filter(
    (id) => !currentWorkOrderIds.includes(id)
  );

  // Find deleted workOrderIds
  const deletedWorkOrderIds = currentWorkOrderIds.filter(
    (id) => !workOrderLinkedJobs.includes(id)
  );

  if (newWorkOrderIds.length != 0) {
    for (const id of newWorkOrderIds) {
      const job = await WorkOrder.findById(new ObjectId(id));
      job.workOrderInvoice = invoice._id;

      await job.save();
    }
  }

  if (deletedWorkOrderIds.length != 0) {
    for (const id of deletedWorkOrderIds) {
      const job = await WorkOrder.findById(new ObjectId(id));
      job.workOrderInvoice = null;

      await job.save();
    }
  }

  invoice.invoiceLinkedTo = linkJobIds;

  await invoice.save();

  return res
    .status(httpStatus.OK)
    .json(ApiResponse.response(workorder_success_code, success_message));
};

// Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const filteredDate = req.body.filteredDate;

    const pipeline = [
      {
        $lookup: {
          from: "workorders",
          localField: "invoiceLinkedWorkOrder",
          foreignField: "_id",
          as: "workOrder",
        },
      },
      {
        $match: {},
      },
      {
        $unwind: "$workOrder",
      },
      {
        $lookup: {
          from: "customers",
          localField: "invoiceLinkedCustomer",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: "$customer",
      },
      {
        $lookup: {
          from: "units",
          localField: "invoiceLinkedUnit",
          foreignField: "_id",
          as: "unit",
        },
      },
      {
        $unwind: "$unit",
      },
      {
        $project: {
          _id: "$_id",
          workOrderCode: "$workOrder.workOrderCode",
          workOrderFrom: "$workOrder.workOrderFrom",
          workOrderInvoiceNumber: "$invoiceNumber",
          customer: "$customer",
          workOrderCompletedDate: "$workOrder.workOrderCompletedDate",
          totalNetItemPrice: { $sum: "$items.itemNetPrice" },
          totalGrossItemPrice: { $sum: "$items.itemGrossPrice" },
          serviceCharges: "$serviceCharges",
          labourCharges: "$labourCharges",
          transportCharges: "$transportCharges",
          otherCharges: "$otherCharges",
          discount: 1,
          grandNetTotal: 1,
          grandTotal: 1,
        },
      },
      {
        $sort: {
          "workOrder.workOrderCompletedDate": 1,
        },
      },
    ];

    if (filteredDate) {
      const date = new Date(filteredDate);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      pipeline[1].$match = {
        "workOrder.workOrderCompletedDate": {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }

    const result = await InvoiceModel.aggregate(pipeline);

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
        $lookup: {
          from: "workorders",
          localField: "invoiceLinkedWorkOrder",
          foreignField: "_id",
          as: "workOrder",
        },
      },
      {
        $match: {},
      },
      {
        $group: {
          _id: null,
          totalGrandNet: { $sum: "$grandNetTotal" },
          totalGrandTotal: { $sum: "$grandTotal" },
        },
      },
      {
        $project: {
          _id: 0,
          NetTotal: "$totalGrandNet",
          total: "$totalGrandTotal",
        },
      },
    ];

    if (filteredDate) {
      const date = new Date(filteredDate);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      pipeline[1].$match = {
        "workOrder.workOrderCompletedDate": {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }

    const result = await InvoiceModel.aggregate(pipeline);

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
