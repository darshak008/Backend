import { Router } from "express";
import { upload } from "../middelwares/multer.middleware";
import { verifyJWT } from "../middelwares/auth.middleware";
const router = Router();

// upload video
// get video
// update video
// delete video

// ** Upload video via multer/coudinary
router.route("/upload-video").post(
  verifyJWT,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
); //TODO: add controller

export default router;
