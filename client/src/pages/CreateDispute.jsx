import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDispute } from "../api/api";

const REASON_CODES = [
  { code: "C08", label: "C08 — Goods/services not received", description: "Goods/Services Not Received" },
  { code: "A01", label: "A01 — Charge amount discrepancy", description: "Charge Amount Discrepancy" },
  { code: "D01", label: "D01 — Duplicate charge", description: "Duplicate Charge" },
  { code: "F10", label: "F10 — Card not present, unrecognized charge", description: "Card Not Present, Unrecognized Charge" },
];

// Backend requires these on creation and does not generate them itself —
// so the frontend generates realistic-looking IDs at submit time.
const genId = (prefix, len = 6) =>
  `${prefix}-${Math.random().toString(36).slice(2, 2 + len).toUpperCase()}`;

const genDisputeId = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `AMEX-D-${ymd}-${seq}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CreateDispute() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    merchantName: "",
    amount: "",
    transactionDate: "",
    reasonCode: "C08",
    statement: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const disputeId = genDisputeId();
      const reason = REASON_CODES.find((r) => r.code === form.reasonCode);

      // Field names here match server/src/models/Dispute.js exactly.
      const payload = {
        disputeId,
        cardMemberId: genId("CM", 5),
        merchantId: genId("MER", 5),
        transaction: {
          merchant: form.merchantName,
          amount: Number(form.amount),
          date: form.transactionDate, // <input type="date"> value is already YYYY-MM-DD
        },
        disputeDetails: {
          reasonCode: form.reasonCode,
          reasonDescription: reason?.description || form.reasonCode,
          dateFiled: todayISO(),
          cardMemberStatement: form.statement,
        },
      };

      const res = await createDispute(payload);
      const id = res.data?.disputeId || disputeId;
      navigate(`/evidence?disputeId=${id}&role=cardMember`);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Couldn't create the dispute. Is the backend running on :5000?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="label-eyebrow mb-3">Step 1 of 3</p>
      <h1 className="font-display text-4xl mb-2">File a dispute</h1>
      <p className="text-slate mb-10 max-w-lg">
        Tell us about the charge you're contesting. We'll ask the merchant
        to respond, then weigh both sides transparently.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label-eyebrow block mb-2">Merchant</label>
            <input
              required
              value={form.merchantName}
              onChange={update("merchantName")}
              placeholder="Amazon.com"
              className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Amount (USD)</label>
            <input
              required
              type="number"
              step="0.01"
              value={form.amount}
              onChange={update("amount")}
              placeholder="1200.00"
              className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label-eyebrow block mb-2">Transaction date</label>
            <input
              required
              type="date"
              value={form.transactionDate}
              onChange={update("transactionDate")}
              className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Reason</label>
            <select
              value={form.reasonCode}
              onChange={update("reasonCode")}
              className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            >
              {REASON_CODES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label-eyebrow block mb-2">
            What happened?
          </label>
          <textarea
            required
            rows={5}
            value={form.statement}
            onChange={update("statement")}
            placeholder="I ordered a laptop on July 14. Tracking hasn't updated since, and the item never arrived. I contacted the merchant twice with no resolution."
            className="w-full border border-line bg-white rounded-lg px-3.5 py-2.5 font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold resize-none"
          />
          <p className="text-slate text-sm mt-1.5">
            Be specific — dates, amounts, and contact attempts all strengthen
            your case in the evidence review.
          </p>
        </div>

        {error && (
          <p className="text-danger text-sm bg-merchantSoft border border-merchant/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper font-body font-medium rounded-lg py-3 hover:bg-inkSoft transition-colors disabled:opacity-50"
        >
          {loading ? "Filing dispute…" : "File dispute & continue to evidence"}
        </button>
      </form>
    </div>
  );
}
