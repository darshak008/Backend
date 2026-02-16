import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    /*
     * Get the auth token
     * validate token
     * send the response if validate or send error -> unauthorized access! 401
     */

    const authToken =
      req.header?.authorization || req.cookies?.accessToken || "";

    if (!authToken) {
      throw new ApiError(401, "Unauthorized access!");
    }

    const JWT_RESPONSE = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET);
    req.user = JWT_RESPONSE;
    next();
  } catch (err) {
    throw new ApiError(401, "Unauthorized access!");
  }
});
