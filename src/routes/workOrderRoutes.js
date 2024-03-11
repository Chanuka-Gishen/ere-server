import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { checkAdmin } from "../middleware/permission.js";
import {
  GetWorkOrdersByUnit,
  addUpdateWorkOrderChargers,
  createRepairJob,
  deleteFilesFromDrive,
  downloadInvoice,
  getDetailsOfWorkOrderWithPopulated,
  getEmployeeAssignedWorkOverview,
  getTodaysWorkCount,
  updateWorkOrderDetails,
  updateWorkOrderEmployeeTips,
  uploadWorkImages,
  workOrderAssign,
  workOrderCompleteState,
} from "../controllers/workOrderController.js";
import multer from "multer";

const workOrderRoutes = express.Router();
const upload = multer();

workOrderRoutes.get(
  "/byUnit/:id",
  [verifyToken, checkAdmin],
  GetWorkOrdersByUnit
);
workOrderRoutes.post("/add-job", [verifyToken, checkAdmin], createRepairJob);
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
workOrderRoutes.delete(
  "/delete-files",
  [verifyToken, checkAdmin],
  deleteFilesFromDrive
);
workOrderRoutes.post(
  "/emp-jobs",
  [verifyToken],
  getEmployeeAssignedWorkOverview
);
workOrderRoutes.put(
  "/tips",
  [verifyToken, checkAdmin],
  updateWorkOrderEmployeeTips
);
workOrderRoutes.post(
  "/chargers",
  [verifyToken, checkAdmin],
  addUpdateWorkOrderChargers
);
workOrderRoutes.get("/download-invoice/:invoiceNo", downloadInvoice);
workOrderRoutes.post("/today-count", getTodaysWorkCount);

export default workOrderRoutes;
