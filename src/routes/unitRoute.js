import express from "express";
import {
  getCustomerUnitDetailsFromQrCode,
  removeQrFromUnit,
  updateUnitQrCode,
} from "../controllers/unitController.js";

const unitRoutes = express.Router();

unitRoutes.put("/update-qr-code", updateUnitQrCode);
unitRoutes.put("/remove-qr-code/:id", removeQrFromUnit);
unitRoutes.get("/unit-by-qr/:qrCodeName", getCustomerUnitDetailsFromQrCode);

export default unitRoutes;
