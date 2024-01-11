import express from "express";
import employeeRoutes from "./employeeRoute.js";
import customerRoutes from "./customerRoute.js";
import workOrderRoutes from "./workOrderRoutes.js";

const router = express.Router();

router.use("/employee", employeeRoutes);
router.use("/customer", customerRoutes);
router.use("/work-order", workOrderRoutes);

export default router;
