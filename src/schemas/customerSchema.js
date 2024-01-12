import Joi from "joi";

export const customerRegisterSchema = Joi.object({
  customerName: Joi.string().required(),
  customerAddress: Joi.string().required(),
  customerMobile: Joi.number().required(),
  customerLand: Joi.number().allow(null),
  customerEmail: Joi.string().email().allow(null),
});
