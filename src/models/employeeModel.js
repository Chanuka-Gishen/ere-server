import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { ADMIN_ROLE, TECHNICIAN_ROLE, HELPER_ROLE } from "../constants/role.js";
import { excludeEmployeeFieldsPlugin } from "../plugin/employeeModelPlugin.js";

const Schema = mongoose.Schema;

const employeeSchema = new Schema({
  userFullName: {
    type: String,
    required: true,
    unique: true,
  },
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  userRole: {
    type: String,
    enum: [ADMIN_ROLE, TECHNICIAN_ROLE, HELPER_ROLE],
    required: true,
  },
  userPassword: {
    type: String,
    required: true,
  },
  userNewPwd: {
    type: Boolean,
    required: true,
    default: true,
  },
  userIsActive: {
    type: Boolean,
    required: true,
    default: true,
  },
  userToken: {
    type: String,
  },
});

employeeSchema.pre("save", async function () {
  const employee = this;

  if (!employee.isModified("userPassword")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(employee.userPassword, salt);
    employee.userPassword = hashedPassword;
    return;
  } catch (error) {
    throw error;
  }
});

employeeSchema.plugin(excludeEmployeeFieldsPlugin);

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
