import Joi from "joi";

export const loginSchema = Joi.object({
  userName: Joi.string().required(),
  userPassword: Joi.string().required(),
});
