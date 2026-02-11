import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
  console.log("This is the request recived from postman: ", req);
  res.status(200).json({
    message: "Darshak Barad",
  });
});

export { registerUser };
