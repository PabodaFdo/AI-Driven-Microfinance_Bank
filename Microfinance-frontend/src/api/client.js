import axios from "axios";
import { getStoredToken } from "../services/authService.js";

const BASE = "http://localhost:8080";

const client = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

client.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Network Error – make sure the backend is running on port 8080";
    return Promise.reject(new Error(msg));
  }
);

export default client;