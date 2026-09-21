export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error("[error]", err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal server error.",
  });
};
