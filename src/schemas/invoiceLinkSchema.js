import Joi from "joi";

export const InvoiceLinkSchema = Joi.object({
  workOrderId: Joi.string().required(),
  workOrderLinkedJobs: Joi.array(),
});
