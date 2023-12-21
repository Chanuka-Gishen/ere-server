import httpStatus from "http-status";
import bcrypt from "bcrypt";

import Employee from "../models/dao/employeeModel.js";
import ApiResponse from "../services/ApiResponse.js";
import {
  auth_success_code,
  bad_request_code,
  employee_error_code,
  employee_exists_code,
  employee_success_code,
} from "../constants/statusCodes.js";
import { employeeRegisterSchema } from "../schemas/employeeSchema.js";
import {
  emploee_not_found,
  employee_exists,
  employee_incorrect_pwd,
  employee_registered,
  logged_in_success,
  logged_out_success,
} from "../constants/messageConstants.js";
import { loginSchema } from "../schemas/loginSchema.js";
import { generateToken, verifyToken } from "../services/jwtServices.js";

// Create default admin
export const createDefaultAdmin = async () => {
  try {
    const userName = (
      process.env.DEFAULT_ADMIN_FNAME + process.env.USERNAME_SUFFIX
    ).toLowerCase();
    const existingAdmin = await Employee.findOne({ userName });

    if (existingAdmin) {
      console.log("Admin exists");
      return;
    }

    const newUser = new Employee({
      userFullName:
        process.env.DEFAULT_ADMIN_FNAME + " " + process.env.DEFAULT_ADMIN_LNAME,
      userName,
      userRole: process.env.DEFAULT_ADMIN_ROLE,
      userPassword: process.env.DEFAULT_ADMIN_PWD,
    });

    const user = await newUser.save();
    console.log("Admin Created - " + user.userName);

    return;
  } catch (error) {
    console.error(error);
    return;
  }
};

// Register employees
export const registerEmployee = async (req, res) => {
  try {
    const { error, value } = employeeRegisterSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { userFirstName, userLastName, userRole, userPassword } = value;

    const userName = (
      userFirstName + process.env.USERNAME_SUFFIX
    ).toLowerCase();

    const userExists = await Employee.findOne({ userName });

    if (userExists)
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(employee_exists_code, employee_exists));

    const newUser = new Employee({
      userFullName: `${userFirstName} ${userLastName}`,
      userName,
      userRole,
      userPassword,
    });

    await newUser.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(employee_success_code, employee_registered));
  } catch (error) {
    console.error(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Login employee
export const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { userName, userPassword } = value;
    const user = await Employee.findOne({ userName });
    if (!user)
      return res
        .status(httpStatus.OK)
        .json(ApiResponse.response(employee_error_code, emploee_not_found));

    const isMatch = await bcrypt.compare(userPassword, user.userPassword);
    if (!isMatch)
      return res
        .status(httpStatus.OK)
        .json(
          ApiResponse.response(employee_error_code, employee_incorrect_pwd)
        );

    const token = generateToken(user._id);

    user.userToken = token;

    const updatedUser = await user.save();

    delete updatedUser.userPassword;
    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(auth_success_code, logged_in_success, updatedUser)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Logout employee
export const logout = async (req, res) => {
  try {
    const tokenPayload = verifyToken(req);

    const user = await Employee.findOne({ _id: tokenPayload.id });

    if (!user)
      return res
        .status(httpStatus.OK)
        .json(ApiResponse.response(employee_error_code, emploee_not_found));

    user.userToken = null;

    await user.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(auth_success_code, logged_out_success));
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
