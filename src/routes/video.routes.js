import { Router } from "express";
import { upload } from "../middelwares/multer.middleware.js";
import { verifyJWT } from "../middelwares/auth.middleware.js";
import { uploadNewVideo } from "../controllers/video.controller.js";
const router = Router();

// upload video
// get video
// update video
// delete video

// ** Upload video via multer/coudinary
router.route("/upload").post(
  verifyJWT,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadNewVideo,
);

export default router;
