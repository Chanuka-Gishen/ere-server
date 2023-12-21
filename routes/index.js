import express from "express";
import employeeRoutes from "./employeeRoute.js";

const router = express.Router();

router.use("/employee", employeeRoutes);

export default router;
