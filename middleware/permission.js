import httpStatus from "http-status";

import ApiResponse from "../services/ApiResponse.js";
import { auth_error_code } from "../constants/statusCodes.js";
import { insufficient_permissions } from "../constants/messageConstants.js";
import { ADMIN_ROLE } from "../constants/role.js";

export const checkAdmin = (req, res, next) => {
  const userRole = req.user.role;

  if (userRole === ADMIN_ROLE) {
    // User has the required role, grant access
    next();
  } else {
    // User does not have the required role, deny access
    res
      .status(httpStatus.FORBIDDEN)
      .json(ApiResponse.error(auth_error_code, insufficient_permissions));
  }
};
