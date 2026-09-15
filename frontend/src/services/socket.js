import { io } from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const SOCKET_URL = API_URL.replace(
  /\/api\/?$/,
  ""
);

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 2000,
  timeout: 10000,
  withCredentials: true,
});

export default socket;
