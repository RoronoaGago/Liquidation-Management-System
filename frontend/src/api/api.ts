import axios from "axios";

const api = axios.create({
  // baseURL: "http://127.0.0.1:8000/",
  // baseURL: "http://192.168.1.91:8000/",
  baseURL: "http://10.92.169.244:8000/",
  withCredentials: true, // if you need cookies/session
});

export default api;
