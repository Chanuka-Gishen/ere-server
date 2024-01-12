import jwt from "jsonwebtoken";
import http from "http-status";
import ApiResponse from "../services/ApiResponse.js";
import { access_denied_code } from "../constants/statusCodes.js";
import { access_denied } from "../constants/messageConstants.js";

export const verifyToken = async (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      return res
        .status(http.UNAUTHORIZED)
        .json(ApiResponse.error(access_denied_code, access_denied));
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length).trimLeft();
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);

    req.user = verified;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
