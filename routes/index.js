import express from "express";
import employeeRoutes from "./employeeRoute.js";
import customerRoutes from "./customerRoute.js";

const router = express.Router();

router.use("/employee", employeeRoutes);
router.use("/customer", customerRoutes);

export default router;
