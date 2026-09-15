import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  } else {
    delete config.headers["Content-Type"];
  }

  // Authentication is handled by the HttpOnly accessToken cookie.
  // Do not send the legacy "session-cookie" placeholder as a Bearer token.
  if (config.headers?.Authorization === "Bearer session-cookie") {
    delete config.headers.Authorization;
  }

  return config;
});

export default api;
