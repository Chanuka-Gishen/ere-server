import Joi from "joi";

export const unitDetailsUpdateSchema = Joi.object({
  _id: Joi.string().required(),
  unitSerialNo: Joi.string().allow(""),
});
