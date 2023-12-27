import express from "express";
import {
  getAllCustomers,
  registerCustomer,
} from "../controllers/customerController.js";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";

const customerRoutes = express.Router();

customerRoutes.post("/register", [verifyToken, checkAdmin], registerCustomer);
customerRoutes.get("/", [verifyToken, checkAdmin], getAllCustomers);

export default customerRoutes;
