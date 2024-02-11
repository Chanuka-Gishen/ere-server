import Joi from "joi";
import {
  COMPLETED_STATUS,
  CREATED_STATUS,
  SCHEDULED_STATUS,
  WORK_ORD_INSTALLATION,
  WORK_ORD_REPAIR,
  WORK_ORD_SERVICE,
} from "../constants/commonConstants.js";

export const WorkOrderUpdateSchema = Joi.object({
  _id: Joi.string().required(),
  workOrderType: Joi.string()
    .valid(WORK_ORD_INSTALLATION, WORK_ORD_SERVICE, WORK_ORD_REPAIR)
    .required(),
  workOrderStatus: Joi.string()
    .valid(CREATED_STATUS, SCHEDULED_STATUS, COMPLETED_STATUS)
    .required(),
  workOrderScheduledDate: Joi.date().required(),
  workOrderInvoiceNumber: Joi.string().allow(null),
});
