import Joi from "joi";
import {
  CMP_ERE,
  CMP_SINGER,
  CMP_SINGER_DIR,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";

export const WorkOrderUpdateSchema = Joi.object({
  _id: Joi.string().required(),
  workOrderType: Joi.string()
    .valid(WORK_ORD_INSTALLATION, WORK_ORD_SERVICE, WORK_ORD_REPAIR)
    .required(),
  workOrderScheduledDate: Joi.date().required(),
  workOrderFrom: Joi.string()
    .valid(CMP_ERE, CMP_SINGER, CMP_SINGER_DIR)
    .required(),
  workOrderInvoiceNumber: Joi.string().allow(null, ""),
  workOrderIsLinked: Joi.boolean().required(),
  workOrderLinkedJobs: Joi.array(),
});
