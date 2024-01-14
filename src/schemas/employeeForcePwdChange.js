import Joi from "joi";

export const employeeForcePwdChange = Joi.object({
  userPassword: Joi.string().required(),
  userConfirmPassword: Joi.string().required(),
});
