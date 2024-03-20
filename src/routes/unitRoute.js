import express from "express";
import {
  deleteUnit,
  getCustomerUnitDetailsFromQrCode,
  getUnitsForCalender,
  removeQrFromUnit,
  updateUnitQrCode,
} from "../controllers/unitController.js";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";

const unitRoutes = express.Router();

unitRoutes.put("/update-qr-code", updateUnitQrCode);
unitRoutes.put("/remove-qr-code/:id", removeQrFromUnit);
unitRoutes.get("/unit-by-qr/:qrCodeName", getCustomerUnitDetailsFromQrCode);
unitRoutes.delete("/:id", [verifyToken, checkAdmin], deleteUnit);
unitRoutes.get("/calendar", [verifyToken, checkAdmin], getUnitsForCalender);

export default unitRoutes;
