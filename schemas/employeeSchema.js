import Joi from "joi";
import { ADMIN_ROLE, HELPER_ROLE, TECHNICIAN_ROLE } from "../constants/role";

export const employeeSchema = Joi.object({
  userFullName: Joi.string().required(),
  userName: Joi.string().required(),
  userRole: Joi.string()
    .valid(ADMIN_ROLE, TECHNICIAN_ROLE, HELPER_ROLE)
    .required(),
  userPassword: Joi.string().required(),
});
