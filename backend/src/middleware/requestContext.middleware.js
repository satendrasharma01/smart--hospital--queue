const crypto = require("crypto");
const { trackMetric } = require("../services/monitoring.service");

const metrics = {
  requests: 0,
  errors: 0,
  totalDurationMs: 0,
};

const requestContext = (req, res, next) => {
  const supplied = req.get("x-request-id");
  const requestId =
    supplied && /^[A-Za-z0-9._:-]{1,100}$/.test(supplied)
      ? supplied
      : crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  metrics.requests += 1;
  trackMetric("http.request.count", 1, { method: req.method });

  res.on("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - startedAt) / 1e6;
    metrics.totalDurationMs += durationMs;
    if (res.statusCode >= 400) metrics.errors += 1;
    if (res.statusCode >= 400) {
      trackMetric("http.error.count", 1, { status: res.statusCode });
    }
    trackMetric("http.response.duration_ms", durationMs, { method: req.method });
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? "error" : "info",
        message: "http_request",
        requestId,
        method: req.method,
        route: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      })
    );
  });

  next();
};

const getMetrics = () => ({
  ...metrics,
  averageDurationMs: metrics.requests
    ? metrics.totalDurationMs / metrics.requests
    : 0,
});

module.exports = { requestContext, getMetrics };
