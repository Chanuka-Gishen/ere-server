import Joi from "joi";
import {
  CMP_ERE,
  CMP_SINGER,
  CMP_SINGER_DIR,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";

export const WorkOrderAddSchema = Joi.object({
  workOrderType: Joi.string()
    .valid(WORK_ORD_INSTALLATION, WORK_ORD_SERVICE, WORK_ORD_REPAIR)
    .required(),
  workOrderUnit: Joi.string().required(),
  workOrderScheduledDate: Joi.date().required(),
  workOrderFrom: Joi.string()
    .valid(CMP_ERE, CMP_SINGER, CMP_SINGER_DIR)
    .required(),
});
