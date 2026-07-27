import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import CreateDispute from "./pages/CreateDispute";
import EvidenceSubmission from "./pages/EvidenceSubmission";
import DisputeResult from "./pages/DisputeResult";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-paper font-body">
      <Nav />
      <Routes>
        <Route path="/" element={<CreateDispute />} />
        <Route path="/evidence" element={<EvidenceSubmission />} />
        <Route path="/result/:id" element={<DisputeResult />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}
