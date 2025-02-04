import Joi from "joi";

export const WorkOrderAssignSchema = Joi.object({
  id: Joi.string().required(),
  workOrderAssignedEmployees: Joi.array().required(),
  totalTip: Joi.number().required().min(0),
});
