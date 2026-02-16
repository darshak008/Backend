import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
  console.log(req.body);

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
export { registerUser, loginUser, logoutUser };
