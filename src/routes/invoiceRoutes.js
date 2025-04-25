import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";
import {
  addUpdateWorkOrderChargers,
  downloadInvoice,
  downloadTotalInvoice,
  getAllInvoices,
  getTotalCostStats,
  updateInvoiceLinkedToContorller,
  updateInvoiceStatus,
} from "../controllers/invoiceController.js";

const invoiceRoutes = express.Router();

invoiceRoutes.post(
  "/chargers",
  [verifyToken, checkAdmin],
  addUpdateWorkOrderChargers
);
invoiceRoutes.post(
  "/link",
  [verifyToken, checkAdmin],
  updateInvoiceLinkedToContorller
);
invoiceRoutes.get("/download-invoice/:id", downloadInvoice);
invoiceRoutes.get("/download-total-invoice/:id", downloadTotalInvoice);
invoiceRoutes.post("/invoices", [verifyToken, checkAdmin], getAllInvoices);
invoiceRoutes.post(
  "/invoices-stats",
  [verifyToken, checkAdmin],
  getTotalCostStats
);
invoiceRoutes.post(
  "/update-status",
  [verifyToken, checkAdmin],
  updateInvoiceStatus
);

export default invoiceRoutes;
