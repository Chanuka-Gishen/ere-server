import Joi from "joi";
import { ACTIVE, INCATIVE } from "../constants/commonConstants.js";

export const unitAddSchema = Joi.object({
  customerId: Joi.string().required(),
  unitModel: Joi.string().required(),
  unitSerialNo: Joi.string().allow(""),
  unitInstalledDate: Joi.date(),
  unitNextMaintenanceDate: Joi.date().required(),
  unitStatus: Joi.string().valid(ACTIVE, INCATIVE).default(ACTIVE),
  unitIsInstalled: Joi.boolean().required(),
});
