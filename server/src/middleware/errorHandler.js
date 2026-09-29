import multer from "multer";

export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Requests the client got wrong — never worth a stack trace.
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Malformed JSON body." });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Request is too large." });
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Each photo must be under 8 MB." : "Invalid photo upload.";
    return res.status(400).json({ message });
  }
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid id." });
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: Object.values(err.errors)[0]?.message || "Invalid data." });
  }

  // Errors raised on purpose carry a status and a message meant for users.
  // Anything else is unexpected: log it, and don't leak internals.
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error("[error]", req.method, req.originalUrl, err);
  const body = { message: err.status ? err.message : "Something went wrong on our side. Please try again." };

  // An AI/payment vendor's raw response is only shown to admins (for
  // debugging); customers get the friendly message above.
  if (err.providerResponse !== undefined && req.user?.role === "admin") {
    body.provider = err.provider;
    body.providerStatus = err.providerStatus;
    body.providerResponse = err.providerResponse;
  }
  res.status(status).json(body);
};
