import express from "express";
import {
  removeQrFromUnit,
  updateUnitQrCode,
} from "../controllers/unitController.js";

const unitRoutes = express.Router();

unitRoutes.put("/update-qr-code", updateUnitQrCode);
unitRoutes.put("/remove-qr-code", removeQrFromUnit);

export default unitRoutes;
