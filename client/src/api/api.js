import axios from "axios";

// Node/Express backend — NOT the Python AI service directly.
// The Node backend calls the AI service internally when /score is hit.
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

export const createDispute = (payload) => api.post("/disputes", payload);

export const submitEvidence = (disputeId, payload) =>
  api.post(`/disputes/${disputeId}/evidence`, payload);

export const runScoring = (disputeId) =>
  api.post(`/disputes/${disputeId}/score`);

export const getDispute = (disputeId) => api.get(`/disputes/${disputeId}`);

export const listDisputes = () => api.get("/disputes");

export default api;