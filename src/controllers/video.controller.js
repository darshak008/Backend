import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const uploadNewVideo = asyncHandler(async (req, res) => {
  // Get the data from the user and validate it
  const { title, description, isPublished } = req.body;

  if (
    [title, description, isPublished].some((field) => {
      field.trim() === "";
    })
  ) {
    throw new ApiError(401, "All fields are required!");
  }

  if (!req.files) {
    throw new ApiError(401, "Video or Thumbnail is missing!");
  }
  console.log("This is the req.files object: ", req.files);

  const videoLocalPath = req.files?.video[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  ``;

  if (!videoLocalPath && !thumbnailLocalPath) {
    throw new ApiError(400, "Video and thumbnail are required!");
  }

  console.log("IM here!");
  const uploadedVideo = await uploadOnCloudinary(videoLocalPath);
  const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!uploadedVideo && !uploadedThumbnail) {
    throw new ApiError(400, "CLOUDINARY: Video and thumbnail are required!");
  }

  const video = await Video.create({
    videoFile: uploadedVideo?.url,
    thumbnail: uploadedThumbnail?.url,
    title,
    description,
    isPublished,
    duration: uploadedVideo?.duration,
    owner: req.user?._id,
  });

  console.log(video);

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully!"));
});

export { uploadNewVideo };
