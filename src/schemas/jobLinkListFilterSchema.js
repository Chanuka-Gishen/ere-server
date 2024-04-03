import Joi from "joi";

export const jobLinkListFilterSchema = Joi.object({
  customerId: Joi.string().required(),
  scheduledDate: Joi.date().required(),
});
