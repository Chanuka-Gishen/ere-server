import { ObjectId } from "mongodb";
import httpStatus from "http-status";
import PDFDocument from "pdfkit";

import { WorkOrder } from "../models/workOrderModel.js";
import ApiResponse from "../services/ApiResponse.js";
import {
  bad_request_code,
  workorder_error_code,
  workorder_success_code,
  workorder_warning_code,
} from "../constants/statusCodes.js";
import {
  invoice_already_closed,
  invoice_should_close_first,
  success_message,
  workOrder_chargers_updated,
  workOrder_not_found,
  workOrder_not_linked,
} from "../constants/messageConstants.js";
import {
  CMP_ERE,
  CMP_SINGER_DIR,
  CMP_SINHAGIRI_DIR,
  INVOICE_SEQUENCE,
} from "../constants/commonConstants.js";
import { getSequenceValue, updateSequenceValue } from "./sequenceController.js";
import {
  generateInvoiceNumber,
  isValidString,
} from "../services/commonServices.js";
import { InvoiceModel } from "../models/invoiceModel.js";
import { InvoiceLinkSchema } from "../schemas/invoiceLinkSchema.js";
import {
  generateInvoicePDF,
  generateMultipleInvoicePDF,
} from "../services/pdfServices.js";
import { INV_CLOSED, INV_CREATED } from "../constants/inoviceStatus.js";

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
        new ObjectId(workOrder.workOrderInvoice),
      );
    } else {
      let invoiceNumber = null;

      if (
        [CMP_ERE, CMP_SINGER_DIR, CMP_SINHAGIRI_DIR].includes(
          workOrder.workOrderFrom,
        )
      ) {
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
      0,
    );

    const itemsNetTotal = items.reduce(
      (total, item) =>
        total +
        (parseFloat(item.itemQty) || 0) * (parseFloat(item.itemNetPrice) || 0),
      0,
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
        ApiResponse.response(
          workorder_success_code,
          workOrder_chargers_updated,
        ),
      );
  } catch (error) {
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
      new ObjectId(workOrder.workOrderInvoice),
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
    id.toString(),
  );

  // Find newly added workOrderIds
  const newWorkOrderIds = workOrderLinkedJobs.filter(
    (id) => !currentWorkOrderIds.includes(id),
  );

  // Find deleted workOrderIds
  const deletedWorkOrderIds = currentWorkOrderIds.filter(
    (id) => !workOrderLinkedJobs.includes(id),
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

// Close invoice
export const updateInvoiceStatus = async (req, res) => {
  const { id } = req.query;
  try {
    const workOrder = await WorkOrder.findById(new ObjectId(id)).populate(
      "workOrderInvoice",
    );
    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_found));
    }

    if (workOrder.workOrderInvoice.invoiceStatus === INV_CLOSED) {
      return res
        .status(httpStatus.PRECONDITION_FAILED)
        .json(ApiResponse.error(workorder_error_code, invoice_already_closed));
    }

    await updateSequenceValue(INVOICE_SEQUENCE);
    const sequenceValue = await getSequenceValue(INVOICE_SEQUENCE);
    const genInvoiceNo = generateInvoiceNumber(sequenceValue);

    let workorders = [];

    if (workOrder.workOrderLinked.length > 0) {
      workorders = workOrder.workOrderLinked.map((id) => new ObjectId(id));
    } else {
      workorders = [new ObjectId(workOrder._id)];
    }

    await InvoiceModel.updateMany(
      { invoiceLinkedWorkOrder: { $in: workorders } },
      { $set: { invoiceNumber: genInvoiceNo, invoiceStatus: INV_CLOSED } },
    );

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(workorder_success_code, success_message));
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const skip = page * limit;
    const filteredDate = req.body.filteredDate;
    const filteredLinkedInvoice = req.body.filteredLinkedInvoice;
    const filteredMainInvoice = req.body.filteredMainInvoice;

    let query = {
      grandTotal: { $gt: 0 },
    };

    if (filteredMainInvoice) {
      query["invoiceNumber"] = {
        $regex: `${filteredMainInvoice}`,
        $options: "i",
      };
    }

    let filteredDateQuery = {};

    if (filteredDate) {
      const date = new Date(filteredDate);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      filteredDateQuery["workOrderCompletedDate"] = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const pipeline = [
      {
        $match: query,
      },
      {
        $lookup: {
          from: "workorders",
          as: "workOrder",
          let: { workOrderId: "$invoiceLinkedWorkOrder" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$workOrderId"] },
                ...(isValidString(filteredDate) && filteredDateQuery),
                ...(isValidString(filteredLinkedInvoice) && {
                  workOrderLinkedInvoiceNo: {
                    $regex: `${filteredLinkedInvoice}`,
                    $options: "i",
                  },
                }),
              },
            },
          ],
        },
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
        $sort: {
          invoiceNumber: -1,
        },
      },
      {
        $project: {
          _id: "$_id",
          workOrderCode: "$workOrder.workOrderCode",
          workOrderFrom: "$workOrder.workOrderFrom",
          workOrderMainInvoice: "$workOrder.workOrderLinkedInvoiceNo",
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
        $facet: {
          totalCount: [{ $count: "count" }], // Get the total count of documents
          data: [
            { $skip: skip }, // Apply pagination
            { $limit: limit },
          ],
        },
      },
    ];

    const result = await InvoiceModel.aggregate(pipeline);

    // Extract the count and the data from the result
    const count = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;
    const data = result[0].data;

    return res.status(httpStatus.OK).json(
      ApiResponse.response(workorder_success_code, success_message, {
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
        ApiResponse.response(
          workorder_success_code,
          success_message,
          result[0],
        ),
      );
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Download single invoice
export const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params; // Work Order Id

    const workOrder = await WorkOrder.findById(new ObjectId(id))
      .populate("workOrderCustomerId")
      .populate({ path: "workOrderUnitReference", populate: "unitQrCode" })
      .populate("workOrderInvoice");

    if (!workOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_found));
    }

    if (!workOrder.workOrderInvoice) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(
          ApiResponse.error(
            workorder_error_code,
            workOrder_invoice_not_created,
          ),
        );
    }

    if (workOrder.workOrderInvoice.invoiceStatus === INV_CREATED) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          ApiResponse.error(workorder_warning_code, invoice_should_close_first),
        );
    }

    // Create a new PDF document
    const doc = new PDFDocument({ bufferPages: true, size: "A4", margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${workOrder.workOrderInvoice.invoiceNumber}.pdf`,
    );

    // Stream the PDF buffer to the response
    doc.pipe(res);

    generateInvoicePDF(
      doc,
      workOrder.workOrderCustomerId,
      workOrder.workOrderUnitReference,
      workOrder,
      workOrder.workOrderInvoice,
    );

    doc.end();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Download liked invoice
export const downloadTotalInvoice = async (req, res) => {
  try {
    const { id } = req.params; // Work Order Id

    const selectedWorkOrder = await WorkOrder.findById(new ObjectId(id))
      .populate("workOrderCustomerId")
      .populate("workOrderUnitReference")
      .populate("workOrderInvoice")
      .populate({ path: "workOrderLinked", populate: "workOrderInvoice" });

    if (!selectedWorkOrder) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_found));
    }

    if (selectedWorkOrder.workOrderLinked.length === 0) {
      return res
        .status(httpStatus.PRECONDITION_FAILED)
        .json(ApiResponse.error(workorder_error_code, workOrder_not_linked));
    }

    if (selectedWorkOrder.workOrderInvoice.invoiceStatus === INV_CREATED) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(
          ApiResponse.error(workorder_warning_code, invoice_should_close_first),
        );
    }

    const workOrders = await WorkOrder.find({
      _id: { $in: selectedWorkOrder.workOrderLinked },
      workOrderInvoice: { $exists: true, $ne: null },
    })
      .populate("workOrderInvoice")
      .populate({
        path: "workOrderUnitReference",
        populate: {
          path: "unitQrCode",
          model: "QRCode",
        },
      });

    const invoice = {
      items: [],
      serviceCharges: 0,
      labourCharges: 0,
      transportCharges: 0,
      otherCharges: 0,
      discount: 0,
      grandTotal: 0,
    };

    for (const job of workOrders) {
      const invoices = job.workOrderInvoice.items.map((item) => ({
        item: item.item,
        itemQty: item.itemQty,
        itemGrossPrice: item.itemGrossPrice,
        qrCode: job.workOrderUnitReference.unitQrCode?.qrCodeName ?? " - ",
      }));

      // Update items
      if (invoices.length > 0) {
        invoice.items.push(...invoices);
      }

      // Update serviceCharges
      invoice.serviceCharges += job.workOrderInvoice.serviceCharges.amount;

      // Update labourCharges
      invoice.labourCharges += job.workOrderInvoice.labourCharges.amount;

      // Update transportCharges
      invoice.transportCharges += job.workOrderInvoice.transportCharges.amount;

      // Update otherCharges
      invoice.otherCharges += job.workOrderInvoice.otherCharges.amount;

      // Update discount
      invoice.discount += job.workOrderInvoice.discount.amount;

      // Update grandTotal
      invoice.grandTotal += job.workOrderInvoice.grandTotal;
    }

    // Create a new PDF document
    const doc = new PDFDocument({ bufferPages: true, size: "A4", margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${selectedWorkOrder.workOrderCode}.pdf`,
    );

    // Stream the PDF buffer to the response
    doc.pipe(res);

    generateMultipleInvoicePDF(
      doc,
      selectedWorkOrder.workOrderCustomerId,
      selectedWorkOrder,
      invoice,
    );

    doc.end();
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
