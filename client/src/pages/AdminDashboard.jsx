import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDisputes } from "../api/api";
import StatusBadge from "../components/StatusBadge";

export default function AdminDashboard() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listDisputes()
      .then((res) => setDisputes(res.data?.disputes || res.data || []))
      .catch(() => setError("Couldn't load the case queue."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <p className="label-eyebrow mb-3">Ops view</p>
      <h1 className="font-display text-4xl mb-2">Case queue</h1>
      <p className="text-slate mb-10">
        Every dispute in the system, newest first.
      </p>

      {loading && <p className="text-slate">Loading…</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && !error && disputes.length === 0 && (
        <div className="border border-dashed border-line rounded-2xl p-14 text-center">
          <p className="text-slate">No disputes filed yet.</p>
          <Link to="/" className="text-gold underline text-sm mt-2 inline-block">
            File the first one
          </Link>
        </div>
      )}

      {disputes.length > 0 && (
        <div className="border border-line rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-eyebrow font-normal px-5 py-3">Case</th>
                <th className="label-eyebrow font-normal px-5 py-3">Merchant</th>
                <th className="label-eyebrow font-normal px-5 py-3">Amount</th>
                <th className="label-eyebrow font-normal px-5 py-3">Status</th>
                <th className="label-eyebrow font-normal px-5 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((d) => {
                const id = d.disputeId || d._id;
                return (
                  <tr key={id} className="border-b border-line last:border-0 hover:bg-paper/60">
                    <td className="px-5 py-3">
                      <Link to={`/result/${id}`} className="font-mono text-xs text-gold underline">
                        {id}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{d.transaction?.merchantName || "—"}</td>
                    <td className="px-5 py-3 font-mono">
                      {d.transaction?.amount ? `$${d.transaction.amount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
  status={d.decision?.decisionTier || d.status?.current}
/>
                    </td>
                    <td className="px-5 py-3 font-mono">
                      {d.decision?.confidence
                        ? `${Math.round(d.decision.confidence * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
