import Joi from "joi";
import { ACTIVE, INCATIVE } from "../constants/commonConstants.js";

export const unitUpdateSchema = Joi.object({
  _id: Joi.string().required(),
  unitModel: Joi.string().required(),
  unitSerialNo: Joi.string().required(),
  unitInstalledDate: Joi.date(),
  unitLastMaintenanceDate: Joi.date().required(),
  unitNextMaintenanceDate: Joi.date().required(),
  unitStatus: Joi.string().valid(ACTIVE, INCATIVE).default(ACTIVE),
});
