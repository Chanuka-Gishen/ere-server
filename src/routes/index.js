import express from "express";
import employeeRoutes from "./employeeRoute.js";
import customerRoutes from "./customerRoute.js";
import workOrderRoutes from "./workOrderRoutes.js";
import unitRoutes from "./unitRoute.js";
import qrCodeRoutes from "./qrCodeRoute.js";
import invoiceRoutes from "./invoiceRoutes.js";

const router = express.Router();

router.use("/employee", employeeRoutes);
router.use("/customer", customerRoutes);
router.use("/work-order", workOrderRoutes);
router.use("/invoice", invoiceRoutes);
router.use("/unit", unitRoutes);
router.use("/qr-code", qrCodeRoutes);

export default router;
