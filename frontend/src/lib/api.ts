import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1", // Proxy handles localhost:3000
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
