import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";
import {
  addUpdateWorkOrderChargers,
  downloadInvoice,
  getAllInvoices,
  getTotalCostStats,
  updateInvoiceLinkedToContorller,
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
invoiceRoutes.post("/invoices", [verifyToken, checkAdmin], getAllInvoices);
invoiceRoutes.post(
  "/invoices-stats",
  [verifyToken, checkAdmin],
  getTotalCostStats
);

export default invoiceRoutes;
