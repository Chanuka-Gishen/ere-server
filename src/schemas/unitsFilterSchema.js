import Joi from "joi";
import { UNIT_ORDER_BY } from "../constants/orderByConstants.js";

export const unitsFilterSchema = Joi.object({
  customerName: Joi.string().allow("").optional().messages({
    "string.base": "Customer name must be a string.",
  }),

  qrCode: Joi.string().allow("").optional().messages({
    "string.base": "QR code must be a valid string.",
  }),

  customerMobileNumber: Joi.string().allow("").optional(),

  unitSerialNo: Joi.string().allow("").optional().messages({
    "string.base": "Unit Serial Number must be a string.",
  }),

  qrCodeLinked: Joi.boolean().allow(null).optional(),

  unitNextMaintenanceDate: Joi.string()
    .allow(null)
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/) // Matches YYYY-MM format
    .optional()
    .messages({
      "string.pattern.base": "Next Maintenance Date must be in YYYY-MM format.",
    }),

  orderBy: Joi.string()
    .valid(UNIT_ORDER_BY.DATE, UNIT_ORDER_BY.QR_CODE)
    .default(UNIT_ORDER_BY.DATE)
    .messages({
      "any.only": "Order by must be either 'qrCode' or 'nextMaintenanceDate'.",
    }),
});
