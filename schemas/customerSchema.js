import Joi from "joi";
import { ACTIVE, INCATIVE } from "../constants/commonConstants.js";

const unitArrayItemSchema = Joi.object({
  unitModel: Joi.string().required(),
  unitSerialNo: Joi.string().required(),
  unitInstalledDate: Joi.date(),
  unitNextMaintenanceDate: Joi.date().required(),
  unitStatus: Joi.string().valid(ACTIVE, INCATIVE).default(ACTIVE),
});

export const customerRegisterSchema = Joi.object({
  customerName: Joi.string().required(),
  customerAddress: Joi.string().required(),
  customerMobile: Joi.number().required(),
  customerLand: Joi.number().allow(null),
  customerEmail: Joi.string().email().allow(null),
  customerUnits: Joi.array().items(unitArrayItemSchema),
});
