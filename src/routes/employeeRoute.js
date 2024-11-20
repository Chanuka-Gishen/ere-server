import express from "express";
import {
  login,
  registerEmployee,
  logout,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  getAllEmployeeForSelect,
  changePasswordForceFullyController,
  resetEmployeePwdController,
  getTotalTipsForLastMonth,
  empTotalTipsController,
  getTotalTipsForCurrentMonth,
  getEmployeeByIdController,
} from "../controllers/employeeController.js";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";

const employeeRoutes = express.Router();

employeeRoutes.post("/register", registerEmployee);
employeeRoutes.post("/login", login);
employeeRoutes.get("/logout", [verifyToken], logout);
employeeRoutes.get("/", [verifyToken, checkAdmin], getAllEmployees);
employeeRoutes.put("/update", [verifyToken, checkAdmin], updateEmployee);
employeeRoutes.put(
  "/set-pwd",
  [verifyToken],
  changePasswordForceFullyController
);
employeeRoutes.put(
  "/reset-pwd/:id",
  [verifyToken, checkAdmin],
  resetEmployeePwdController
);
employeeRoutes.delete(
  "/delete/:userId",
  [verifyToken, checkAdmin],
  deleteEmployee
);
employeeRoutes.get(
  "/select",
  [verifyToken, checkAdmin],
  getAllEmployeeForSelect
);
employeeRoutes.get(
  "/tips/:id",
  [verifyToken, checkAdmin],
  getTotalTipsForLastMonth
);
employeeRoutes.get(
  "/tips-current/:id",
  [verifyToken, checkAdmin],
  getTotalTipsForCurrentMonth
);
employeeRoutes.get(
  "/total-tips/:id",
  [verifyToken, checkAdmin],
  empTotalTipsController
);
employeeRoutes.get(
  "/details/:id",
  [verifyToken, checkAdmin],
  getEmployeeByIdController
);

export default employeeRoutes;
