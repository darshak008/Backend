import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFile) => {
  try {
    if (!localFile) return null;

    // Upload the file to cloudinary
    const response = await cloudinary.uploader.upload(localFile, {
      resource_type: "auto",
      folder: "Ytube",
    });
    // console.log("File is uploaded on cloudinary", response.url);
    fs.unlinkSync(localFile);
    return response;
  } catch (err) {
    fs.unlinkSync(localFile); // remove localFiles as upload error
    return null;
  }
};

export { uploadOnCloudinary };
