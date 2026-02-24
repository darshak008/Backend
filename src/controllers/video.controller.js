import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const uploadNewVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished, owner } = req.body;

  if (
    [title, description, isPublished, owner].some((field) => {
      field.trim() === "";
    })
  ) {
    throw new ApiError(401, "All fields are required!");
  }

  if (!req.file) {
    throw new ApiError(401, "Video or Thumbnail is missing!");
  }
  const { video, thumbnail } = req.file;
});
