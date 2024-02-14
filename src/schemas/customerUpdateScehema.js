import Joi from "joi";

export const customerUpdateSchema = Joi.object({
  customerId: Joi.string().required(),
  customerName: Joi.string().required(),
  customerAddress: Joi.string().required(),
  customerMobile: Joi.number().required(),
  customerLand: Joi.number().allow(null),
  customerEmail: Joi.string().email().allow(null),
  customerLocation: Joi.string().allow(null),
});
