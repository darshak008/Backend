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

  const video = await Video.find();

  if (!video) {
    throw new ApiError(404, "Videos not found!");
  }

  res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully!"));
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

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(404, "Video not found! Invalid video id.");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found!");
  }

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetced successfully!"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(404, "Video not found! Invalid video id.");
  }

  if (!req.file) {
    throw new ApiError(401, "Thumbnail is required!");
  }
  const thumbnailLocalPath = req.file?.path;

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(401, "Failed to upload! Thumbnail is requred!");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: thumbnail?.url,
      },
    },
    { new: true },
  );

  res
    .status(200)
    .json(new ApiResponse(200, video, "Views updated successfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if (!videoId) {
    throw new ApiError(401, "Video id not found!");
  }

  const deletedVideo = await Video.findOneAndDelete(videoId, { new: true });
  console.log(deletedVideo);

  res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(401, "Video id not found!");
  }

  const video = await Video.findById(videoId);

  video.isPublished = video.isPublished ? false : true;
  await video.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        video.isPublished ? "Video is now published" : "Video is now private",
      ),
    );
});

export {
  uploadNewVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
