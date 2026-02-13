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

  //**finding user by its username or email**

  const emailRegx = new RegExp(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  );
  // for email validation
  if (emailRegx.test(usernameOrEmail)) {
    const user = await User.findOne({ email: usernameOrEmail });

    if (!user) {
      throw new ApiError(404, "username or password is incorrect!");
    }

    const isValid = await user.isPasswordCorrect(password);
    if (!isValid) {
      throw new ApiError(401, "username or password incorrect!");
    }
  }

  //for username validation
  if (!emailRegx.test(usernameOrEmail)) {
    const user = await User.findOne({ username: usernameOrEmail });

    if (!user) {
      throw new ApiError(404, "username or password is incorrect!");
    }

    const isValid = await user.isPasswordCorrect(password);

    if (!isValid) {
      throw new ApiError(401, "username or password incorrect!");
    }
  }
});

export { registerUser, loginUser };
