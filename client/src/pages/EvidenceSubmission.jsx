import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { submitEvidence, runScoring } from "../api/api";

const EVIDENCE_TYPES = {
  cardMember: [
    { value: "invoice", label: "Purchase invoice / receipt" },
    { value: "communication_log", label: "Chat / email with merchant" },
    { value: "other", label: "Other" },
  ],
  merchant: [
    { value: "proof_of_delivery", label: "Proof of delivery / tracking" },
    { value: "communication_log", label: "Chat / email with card member" },
    { value: "policy", label: "Return / refund policy" },
    { value: "other", label: "Other" },
  ],
};

export default function EvidenceSubmission() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [disputeId, setDisputeId] = useState(params.get("disputeId") || "");
  const [role, setRole] = useState(params.get("role") || "cardMember");
  const [type, setType] = useState(EVIDENCE_TYPES.cardMember[0].value);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!disputeId) {
      setError("Enter the dispute ID first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Field names match server/src/models/Dispute.js EvidenceSchema:
      // { evidenceId, submittedBy, type, text, fileUrl? }
      await submitEvidence(disputeId, {
        evidenceId: `EV-${Date.now().toString(36).toUpperCase()}`,
        submittedBy: role,
        type,
        text,
      });
      setSubmitted((s) => [...s, { role, type, text }]);
      setText("");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Couldn't submit that evidence."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRunScoring = async () => {
    setScoring(true);
    setError("");
    try {
      await runScoring(disputeId);
      navigate(`/result/${disputeId}`);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Scoring failed — make sure evidence exists for both sides and the AI service is running on :8000."
      );
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="label-eyebrow mb-3">Step 2 of 3</p>
      <h1 className="font-display text-4xl mb-2">Submit evidence</h1>
      <p className="text-slate mb-10 max-w-lg">
        Both the card member and the merchant add evidence to the same
        case file. Nothing is scored until both sides have had a chance
        to respond.
      </p>

      <div className="mb-8">
        <label className="label-eyebrow block mb-2">Dispute ID</label>
        <input
          value={disputeId}
          onChange={(e) => setDisputeId(e.target.value)}
          placeholder="AMEX-D-20260718-0042"
          className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
        />
      </div>

      <div className="flex gap-2 mb-8 bg-white border border-line rounded-lg p-1 w-fit">
        {["cardMember", "merchant"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRole(r);
              setType(EVIDENCE_TYPES[r][0].value);
            }}
            className={`label-eyebrow px-4 py-2 rounded-md transition-colors ${
              role === r
                ? r === "cardMember"
                  ? "bg-memberSoft text-member"
                  : "bg-merchantSoft text-merchant"
                : "text-slate hover:text-ink"
            }`}
          >
            {r === "cardMember" ? "Card member" : "Merchant"}
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-5">
        <div>
          <label className="label-eyebrow block mb-2">Evidence type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            {EVIDENCE_TYPES[role].map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-eyebrow block mb-2">Details</label>
          <textarea
            required
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the relevant text — receipt contents, chat transcript, tracking status, etc."
            className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold resize-none"
          />
        </div>

        {error && (
          <p className="text-danger text-sm bg-merchantSoft border border-merchant/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full border border-ink text-ink font-medium rounded-lg py-3 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add evidence"}
        </button>
      </form>

      {submitted.length > 0 && (
        <div className="mt-8 space-y-2">
          <p className="label-eyebrow">Added this session</p>
          {submitted.map((s, i) => (
            <div
              key={i}
              className="text-sm border border-line bg-white rounded-lg px-3.5 py-2.5 flex gap-3"
            >
              <span
                className={
                  s.role === "cardMember" ? "text-member" : "text-merchant"
                }
              >
                {s.role === "cardMember" ? "Card member" : "Merchant"}
              </span>
              <span className="text-slate">·</span>
              <span className="text-slate">{s.type}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 pt-8 border-t border-line">
        <button
          onClick={handleRunScoring}
          disabled={scoring || !disputeId}
          className="w-full bg-gold text-white font-medium rounded-lg py-3 hover:bg-[#A87A22] transition-colors disabled:opacity-50"
        >
          {scoring ? "Weighing evidence…" : "Run AI analysis →"}
        </button>
        <p className="text-slate text-sm mt-2 text-center">
          Both sides should have submitted evidence before running this.
        </p>
      </div>
    </div>
  );
}
