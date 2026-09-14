const provider = { onMetric: null, onError: null };

const setMonitoringProvider = (nextProvider = {}) => {
  provider.onMetric = typeof nextProvider.onMetric === "function" ? nextProvider.onMetric : null;
  provider.onError = typeof nextProvider.onError === "function" ? nextProvider.onError : null;
};

const trackMetric = (name, value = 1, tags = {}) => {
  if (provider.onMetric) provider.onMetric({ name, value, tags, timestamp: new Date().toISOString() });
};

const reportError = (error, context = {}) => {
  if (provider.onError) provider.onError({
    name: error?.name,
    message: error?.message,
    code: error?.code,
    context,
  });
};

module.exports = { setMonitoringProvider, trackMetric, reportError };
