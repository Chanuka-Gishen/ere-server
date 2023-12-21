import express from "express";
import {
  login,
  registerEmployee,
  logout,
} from "../controllers/employeeController.js";

const employeeRoutes = express.Router();

employeeRoutes.post("/register", registerEmployee);
employeeRoutes.post("/login", login);
employeeRoutes.get("/logout", logout);

export default employeeRoutes;
