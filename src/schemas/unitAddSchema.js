import Joi from "joi";

export const unitAddSchema = Joi.object({
  customerId: Joi.string().required(),
  unitBrand: Joi.string().required(),
  unitModel: Joi.string().required(),
  unitSerialNo: Joi.string().allow(""),
  unitInstalledDate: Joi.date().allow(null),
});
