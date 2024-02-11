import Joi from "joi";

export const unitUpdateQrSchema = Joi.object({
  unitId: Joi.string().required(),
  qrCodeName: Joi.string().required(),
});
