import Joi from "joi";
import { ADMIN_ROLE, HELPER_ROLE, TECHNICIAN_ROLE } from "../constants/role.js";

export const employeeUpdateSchema = Joi.object({
  _id: Joi.string().required(),
  userFirstName: Joi.string().required(),
  userLastName: Joi.string().required(),
  userRole: Joi.string()
    .valid(ADMIN_ROLE, TECHNICIAN_ROLE, HELPER_ROLE)
    .required(),
});
