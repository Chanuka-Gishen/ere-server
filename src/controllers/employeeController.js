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
  employee_deleted,
  employee_exists,
  employee_inactive,
  employee_incorrect_pwd,
  employee_not_found,
  employee_password_not_match,
  employee_registered,
  employee_updated,
  employee_username_exists,
  logged_in_success,
  logged_out_success,
  success_message,
} from "../constants/messageConstants.js";
import { loginSchema } from "../schemas/loginSchema.js";
import { generateToken } from "../services/jwtServices.js";
import { employeeUpdateSchema } from "../schemas/employeeUpdateSchema.js";
import { ObjectId } from "mongodb";
import { HELPER_ROLE, TECHNICIAN_ROLE } from "../constants/role.js";
import { employeeForcePwdChange } from "../schemas/employeeForcePwdChange.js";
import { createRandomPassword } from "../services/commonServices.js";

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

    const { userFirstName, userLastName, userRole } = value;

    const userName = (
      userFirstName.replace(/\s/g, "") + process.env.USERNAME_SUFFIX
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
      userPassword: createRandomPassword(),
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

export const changePasswordForceFullyController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await Employee.findById(new ObjectId(userId));

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.response(bad_request_code, employee_not_found));
    }

    const { error, value } = employeeForcePwdChange.validate(req.body);

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const { userPassword, userConfirmPassword } = value;

    if (userPassword != userConfirmPassword) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, employee_password_not_match));
    }

    user.userPassword = userPassword;
    user.userNewPwd = false;

    const savedUser = await user.save();

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(employee_success_code, success_message, savedUser)
      );
  } catch (error) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

export const resetEmployeePwdController = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(new ObjectId(id));

    if (!employee) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.response(bad_request_code, employee_not_found));
    }

    employee.userNewPwd = true;

    await employee.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(employee_success_code, success_message));
  } catch (error) {
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
    const user = await Employee.findOne({ userName: userName.toLowerCase() });
    if (!user)
      return res
        .status(httpStatus.OK)
        .json(ApiResponse.response(employee_error_code, employee_not_found));

    if (!user.userIsActive) {
      return res
        .status(httpStatus.OK)
        .json(ApiResponse.response(employee_error_code, employee_inactive));
    }

    const isMatch = await bcrypt.compare(userPassword, user.userPassword);
    if (!isMatch && !user.userNewPwd)
      return res
        .status(httpStatus.OK)
        .json(
          ApiResponse.response(employee_error_code, employee_incorrect_pwd)
        );

    const token = generateToken(user._id, user.userRole);

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
    const user = await Employee.findOne({ _id: req.user.id });

    if (!user)
      return res
        .status(httpStatus.httpStatus.NOT_FOUND)
        .json(ApiResponse.response(employee_error_code, employee_not_found));

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

// Update Employee
export const updateEmployee = async (req, res) => {
  try {
    const { error, value } = employeeUpdateSchema.validate(req.body);

    const { _id, userFirstName, userLastName, userRole } = value;

    if (error) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(bad_request_code, error.message));
    }

    const existingUser = await Employee.findById(_id);

    if (!existingUser) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(employee_error_code, employee_not_found));
    }

    const userName = (
      userFirstName + process.env.USERNAME_SUFFIX
    ).toLowerCase();

    const existingUserName = await Employee.findOne({ userName });

    if (existingUserName && existingUser.userName != userName) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(ApiResponse.error(employee_error_code, employee_username_exists));
    }

    existingUser.userFullName = `${userFirstName} ${userLastName}`;
    existingUser.userName = userName;
    existingUser.userRole = userRole;

    await existingUser.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(employee_success_code, employee_updated));
  } catch (error) {
    console.error(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { userId } = req.params;

    const existingUser = await Employee.findById(new ObjectId(userId));

    if (!existingUser) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json(ApiResponse.error(employee_error_code, employee_not_found));
    }

    // await Employee.deleteOne(existingUser);
    // Make employee inactive in that case
    existingUser.userIsActive = false;

    await existingUser.save();

    return res
      .status(httpStatus.OK)
      .json(ApiResponse.response(employee_success_code, employee_deleted));
  } catch (error) {
    console.error(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(employee_success_code, success_message, employees)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};

//Get employee for selection
export const getAllEmployeeForSelect = async (req, res) => {
  try {
    const employees = await Employee.find(
      { userRole: { $in: [TECHNICIAN_ROLE, HELPER_ROLE] }, userIsActive: true }, // Filter by roles and active sts
      { _id: 1, userFullName: 1, userRole: 1 }
    );

    return res
      .status(httpStatus.OK)
      .json(
        ApiResponse.response(employee_success_code, success_message, employees)
      );
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.BAD_REQUEST)
      .json(ApiResponse.error(bad_request_code, error.message));
  }
};
