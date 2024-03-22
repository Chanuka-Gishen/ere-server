import Joi from "joi";
import { ACTIVE, INCATIVE } from "../constants/commonConstants.js";

export const unitUpdateSchema = Joi.object({
  _id: Joi.string().required(),
  unitBrand: Joi.string().required(),
  unitModel: Joi.string().required(),
  unitSerialNo: Joi.string().allow(""),
  unitInstalledDate: Joi.date().allow(null),
  unitLastMaintenanceDate: Joi.date().allow(null),
  unitNextMaintenanceDate: Joi.date().allow(null),
  unitStatus: Joi.string().valid(ACTIVE, INCATIVE).default(ACTIVE),
});
