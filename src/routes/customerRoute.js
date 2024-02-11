import express from "express";
import {
  getAllCustomers,
  getCustomer,
  registerCustomer,
  updateCustomer,
} from "../controllers/customerController.js";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";
import {
  AddCustomerUnit,
  getCustomerUnits,
  updateCustomerUnit,
  updateUnitSerialNumber,
} from "../controllers/unitController.js";

const customerRoutes = express.Router();

customerRoutes.post("/register", [verifyToken, checkAdmin], registerCustomer);
customerRoutes.get("/", [verifyToken, checkAdmin], getAllCustomers);
customerRoutes.get(
  "/customer-details/:customerId",
  [verifyToken, checkAdmin],
  getCustomer
);
customerRoutes.put("/", [verifyToken, checkAdmin], updateCustomer);
customerRoutes.post("/unit", [verifyToken, checkAdmin], AddCustomerUnit);
customerRoutes.put("/unit", [verifyToken, checkAdmin], updateCustomerUnit);
customerRoutes.put(
  "/unit-details-update",
  [verifyToken],
  updateUnitSerialNumber
);
customerRoutes.get("/unit/:id", [verifyToken], getCustomerUnits);

export default customerRoutes;
