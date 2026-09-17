import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 15000,
});

// Keep one refresh request shared by all API calls that receive a 401 at
// the same time. This prevents concurrent refresh-token rotation races.
let refreshPromise = null;

const isAuthEndpoint = (url = "") => {
  const normalizedUrl = url.split("?")[0];

  return [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ].some((endpoint) => normalizedUrl.endsWith(endpoint));
};

const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use((config) => {
  if (!(config.data instanceof FormData)) {
    config.headers = config.headers || {};
    config.headers["Content-Type"] = "application/json";
  } else if (config.headers) {
    delete config.headers["Content-Type"];
  }

  // Authentication is handled by the HttpOnly accessToken cookie.
  // Do not send the legacy "session-cookie" placeholder as a Bearer token.
  if (config.headers?.Authorization === "Bearer session-cookie") {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // The refresh endpoint rotates the refresh token, so all concurrent
      // requests must wait for the same refresh operation.
      await refreshSession();

      // Axios reuses the original request config. Cookies are attached
      // automatically because withCredentials is enabled.
      return api(originalRequest);
    } catch (refreshError) {
      // Let AuthContext clear the in-memory user when the refresh session
      // itself is no longer valid. Do not clear it for an ordinary API 401
      // before attempting the refresh above.
      window.dispatchEvent(new Event("authSessionExpired"));
      return Promise.reject(refreshError);
    }
  }
);

export default api;
