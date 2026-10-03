import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// First gate on the declared type; scanController then checks the bytes
// really decode as an image (the declared type is only the client's claim).
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return cb(Object.assign(new Error("Please upload a JPEG, PNG or WebP photo."), { status: 400 }), false);
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 3, fields: 5 },
});

// Salon dashboard uploads: logo/cover/product photo, and customer scans
// (which carry a few extra form fields).
export const salonUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 3, fields: 12 },
});
