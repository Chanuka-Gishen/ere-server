import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";
import {
  GetWorkOrdersByUnit,
  deleteFileApi,
  getDetailsOfWorkOrderWithPopulated,
  updateWorkOrderDetails,
  uploadWorkImages,
  workOrderAssign,
  workOrderCompleteState,
} from "../controllers/WorkOrderController.js";
import multer from "multer";

const workOrderRoutes = express.Router();
const upload = multer();

workOrderRoutes.get(
  "/byUnit/:id",
  [verifyToken, checkAdmin],
  GetWorkOrdersByUnit
);
workOrderRoutes.get("/:id", [verifyToken], getDetailsOfWorkOrderWithPopulated);
workOrderRoutes.put("/", [verifyToken, checkAdmin], updateWorkOrderDetails);
workOrderRoutes.post(
  "/add-employees",
  [verifyToken, checkAdmin],
  workOrderAssign
);
workOrderRoutes.put(
  "/complete/:id",
  [verifyToken, checkAdmin],
  workOrderCompleteState
);
workOrderRoutes.post(
  "/upload-images/:id",
  [verifyToken, upload.array("files")],
  uploadWorkImages
);
workOrderRoutes.delete("/delete-file-api/:id", [verifyToken, deleteFileApi]);

export default workOrderRoutes;
