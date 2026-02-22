import express from "express";
import {
  getAllCustomers,
  getCustomer,
  getCustomerRemainderLogs,
  getCustomersRemainderLogs,
  GetUpcomingMaintainences,
  registerCustomer,
  sendCustomerServiceRemainder,
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
  getCustomer,
);
customerRoutes.put("/", [verifyToken, checkAdmin], updateCustomer);
customerRoutes.post("/unit", [verifyToken, checkAdmin], AddCustomerUnit);
customerRoutes.put("/unit", [verifyToken, checkAdmin], updateCustomerUnit);
customerRoutes.put(
  "/unit-details-update",
  [verifyToken],
  updateUnitSerialNumber,
);
customerRoutes.get("/unit/:id", [verifyToken], getCustomerUnits);
customerRoutes.get(
  "/recent-maintainence",
  [verifyToken, checkAdmin],
  GetUpcomingMaintainences,
);
customerRoutes.get(
  "/recent-logs",
  [verifyToken, checkAdmin],
  getCustomersRemainderLogs,
);
customerRoutes.get(
  "/logs",
  [verifyToken, checkAdmin],
  getCustomerRemainderLogs,
);
customerRoutes.post(
  "/create-log",
  [verifyToken, checkAdmin],
  sendCustomerServiceRemainder,
);

export default customerRoutes;
