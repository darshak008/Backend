import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  /*

   * Get user details from frontend
   * Validation - Not empty
   * Check if user already exist: username, email
   * Check for images, check for avatar
   * Upload them to cloudinary, avatar
   * Create user object - create entry in DB
   * Remove password and refresh token fields from response
   * Check for user creation
   * Return response(res)
   
   */

  // Get user details from frontend
  if (!req.body) {
    throw new ApiError(400, "All fields are required!");
  }

  const { fullName, username, email, password } = req.body;

  // Validation - Not empty
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  // Check if user already exist: username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // Check for images, check for avatar

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImageLocalPath[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // Upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // Create user object - create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfullys!"));
});

const loginUser = asyncHandler(async (req, res) => {
  /*
   * req body -> data
   * username or email
   * find the user
   * password check
   * access and refresh token
   * send cookie
   */

  // **Getting data from req.body**
  if (!req.body) {
    throw new ApiError(400, "All fields are required!");
  }
  const { usernameOrEmail, password } = req.body;
  if ([usernameOrEmail, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!");
  }

  // **finding user by its username or email**

  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });

  if (!user) {
    throw new ApiError(401, "User doesn't exists!");
  }

  const isValidPass = user.isPasswordCorrect(password);
  if (!isValidPass) {
    throw new ApiError(401, "Invalid user credentials!");
  }

  // **Generating and sending Access and refresh token to the client**

  const JWTAccessToken = user.generateAccessToken();
  const JWTRefreshToken = user.generateRefreshToken();

  // setting refresh token in DB
  user.refreshToken = JWTRefreshToken;
  user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  //sending res with refresh token and access token
  res
    .status(200)
    .cookie("refreshToken", JWTRefreshToken, cookieOptions)
    .cookie("accessToken", JWTAccessToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          accessToken: JWTAccessToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.fullName,
            username: user.username,
          },
        },
        "User logged in successfully!",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  /*
   * Get the user data from req.user
   * remove the refreshToken from the DB
   * remove the access and refresh token from cookies
   * send res -> 204 "User logged out successfully!"
   */
  // ** Getting the user information from the req.user **
  const { _id } = req.user;

  // ** Removing refresh token from the DB **
  const updatedUser = await User.findOneAndUpdate(
    { _id },
    {
      refreshToken: null,
    },
    { new: true },
  );
  console.log("This is updated user: ", updatedUser);

  // ** remove the access and refresh token from cookies and sending the response **

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res
    .status(204)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(204));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    console.log("Decoded jwt token: ", decodedToken);

    if (!decodedToken) {
      throw new ApiError(401, "Unauthorized request!");
    }

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used!");
    }

    const newAccessToken = await user.generateAccessToken();
    const newRefreshToken = await user.generateRefreshToken();

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res
      .status(201)
      .cookie("accessToken", newAccessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { newAccessToken, refreshToken: newRefreshToken },
          "Access token refreshed!",
        ),
      );
  } catch (err) {
    throw new ApiError(401, err?.message || "Invalid refresh token!");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  /*
   * Get the oldPassword and newPassword from req.body
   * Get the user detail from the req.user
   * Validate password from the DB and validate from and validate from oldPassword
   * set new password to the DB
   * send res
   */

  // ** Gitting the oldPassword and newPassword from req.body **
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword && !newPassword) {
    throw new ApiError(400, "All fields are required!");
  }

  const { _id } = req.user;
  const user = await User.findById(_id);
  const isPasswordValid = user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid old password!");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(401, "All fields are required!");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true },
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(401, "Given field is required!");
  }

  const oldAvatarUrl = req.user.avatar;
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar!");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true },
  ).select("-password");
  res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar changed successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(401, "Given field is required!");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image!");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: coverImage.url,
      },
    },
    { new: true },
  ).select("-password");
  res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar changed successfully!"));
});

const getUserProfileDetails = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "Username is missing!");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        $subscriberCount: {
          $size: "subscribers",
        },
        $channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        $isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        $subscriberCount: 1,
        $channelsSubscribedToCount: 1,
        $isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel doesn't exists!");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel  fetched successfully!"),
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              $first: "$owner",
            },
          },
        ],
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully!",
      ),
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserProfileDetails,
  getWatchHistory,
};
