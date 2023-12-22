import express from "express";
import {
  login,
  registerEmployee,
  logout,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";

const employeeRoutes = express.Router();

employeeRoutes.post("/register", registerEmployee);
employeeRoutes.post("/login", login);
employeeRoutes.get("/logout", [verifyToken], logout);
employeeRoutes.get("/", [verifyToken, checkAdmin], getAllEmployees);
employeeRoutes.put("/update", [verifyToken, checkAdmin], updateEmployee);
employeeRoutes.delete(
  "/delete/:userId",
  [verifyToken, checkAdmin],
  deleteEmployee
);

export default employeeRoutes;
