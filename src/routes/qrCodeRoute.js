import express from "express";
import { getAvailableQrCodes } from "../controllers/qrController.js";

const qrCodeRoutes = express.Router();

qrCodeRoutes.get("/", getAvailableQrCodes);

export default qrCodeRoutes;
