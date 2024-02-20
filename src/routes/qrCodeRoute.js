import express from "express";
import {
  createBulkQrCodes,
  getAvailableQrCodeCount,
  getAvailableQrCodes,
} from "../controllers/qrController.js";
import { checkAdmin } from "../middleware/permission.js";
import { verifyToken } from "../middleware/auth.js";

const qrCodeRoutes = express.Router();

qrCodeRoutes.get("/", getAvailableQrCodes);
qrCodeRoutes.get("/generate", [verifyToken, checkAdmin], createBulkQrCodes);
qrCodeRoutes.get("/count", getAvailableQrCodeCount);

export default qrCodeRoutes;
