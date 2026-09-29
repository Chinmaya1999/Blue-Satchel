export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error("[error]", err);
  const status = err.status || 500;
  const body = { message: err.message || "Internal server error." };
  // When a scan fails at the AI vendor, forward the vendor's raw response
  // (e.g. an out-of-credits or rate-limit payload) so the client can show
  // exactly what the API returned instead of a generic message.
  if (err.providerResponse !== undefined) {
    body.provider = err.provider;
    body.providerStatus = err.providerStatus;
    body.providerResponse = err.providerResponse;
  }
  res.status(status).json(body);
};
