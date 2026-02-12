import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
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

  try {
    // Get user details from frontend
    const { fullname, username, email, password } = req.body;

    console.log("Email: ", email);

    // Validation - Not empty
    if (
      [fullname, username, email, password].some(
        (field) => field?.trim() === "",
      )
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
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar file is required!");
    }
  } catch (err) {
    console.log("ERROR: ", err.message);
  }

  // Upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // Create user object - create entry in DB
  const user = await User.create({
    fullname,
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

export { registerUser };
