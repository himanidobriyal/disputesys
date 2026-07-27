import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import jsPDF from "jspdf";
import { getDispute } from "../api/api";
import StatusBadge from "../components/StatusBadge";
import FairnessScale from "../components/FairnessScale";

export default function DisputeResult() {
  const { id } = useParams();
  const [dispute, setDispute] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDispute(id)
      .then((res) => !cancelled && setDispute(res.data))
      .catch(() => !cancelled && setError("Couldn't load this dispute."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center text-slate">
        Loading decision…
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-danger mb-4">{error || "Dispute not found."}</p>
        <Link to="/" className="text-gold underline">
          File a new dispute
        </Link>
      </div>
    );
  }

  const scoring = dispute.scoring || {};
  const decision = dispute.decision || {};
  const memberPct = Math.round(
    (scoring.normalizedConfidence?.cardMember ?? scoring.cardMemberScore / 100 ?? 0.5) * 100
  );
  const merchantPct = 100 - memberPct;

  const outcomeLabel =
    decision.recommendedOutcome === "cardMember"
      ? "In favor of card member"
      : decision.recommendedOutcome === "merchant"
      ? "In favor of merchant"
      : "Referred for human review";

  // Turns the structured decision into a plain-English paragraph, the way
  // a human case reviewer would explain it in an email — not a bulleted
  // list of technical signals. This is what leads the PDF/Word export and
  // the on-screen summary card.
  const buildNarrative = () => {
    const merchant = dispute.transaction?.merchant || "the merchant";
    const amount = dispute.transaction?.amount
      ? `$${dispute.transaction.amount.toFixed(2)}`
      : "the disputed amount";
    const confidencePct = Math.round((decision.confidence ?? 0) * 100);
    const tier = decision.decisionTier;

    let opening;
    if (decision.recommendedOutcome === "cardMember") {
      opening = `This dispute over a ${amount} charge from ${merchant} has been resolved in favor of the card member, with ${confidencePct}% confidence.`;
    } else if (decision.recommendedOutcome === "merchant") {
      opening = `This dispute over a ${amount} charge from ${merchant} has been resolved in favor of the merchant, with ${confidencePct}% confidence.`;
    } else {
      opening = `This dispute over a ${amount} charge from ${merchant} was too close to call automatically (${confidencePct}% confidence) and has been referred to a human reviewer.`;
    }

    const body = (decision.reasoning || []).join(" ");

    let closing;
    if (tier === "auto_resolve") {
      closing = "Because the evidence clearly favored one side, this resolution is considered final.";
    } else if (tier === "needs_more_evidence") {
      closing = "Because the evidence was not fully conclusive, either party may be asked to submit additional documentation before this case is finalized.";
    } else if (tier === "escalate_to_human") {
      closing = "Because both sides presented comparably strong evidence, a human reviewer will make the final call rather than relying on the automated score alone.";
    } else {
      closing = "";
    }

    return [opening, body, closing].filter(Boolean).join(" ");
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 64;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    // Title
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(20);
    doc.setTextColor(28, 35, 51);
    doc.text("Resolve — Decision Summary", margin, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(dispute.disputeId || id, margin, y);
    y += 24;

    doc.setDrawColor(228, 224, 214);
    doc.line(margin, y, pageWidth - margin, y);
    y += 28;

    // The summary paragraph — this is the whole point of the export.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(28, 35, 51);
    const lines = doc.splitTextToSize(buildNarrative(), maxWidth);
    lines.forEach((line) => {
      doc.text(line, margin, y);
      y += 19;
    });

    y += 24;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);

    doc.save(`${dispute.disputeId || id}-decision-summary.pdf`);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="label-eyebrow mb-3">Step 3 of 3</p>
      <div className="flex items-start justify-between mb-2">
        <h1 className="font-display text-4xl">Decision</h1>
        <StatusBadge status={decision.decisionTier || dispute.status?.current} />
      </div>
      <div className="flex items-center justify-between mb-10">
        <p className="text-slate font-mono text-sm">{dispute.disputeId || id}</p>
        <button
          onClick={handleDownloadPDF}
          className="label-eyebrow border border-line rounded-lg px-3.5 py-2 hover:border-ink hover:text-ink transition-colors"
        >
          ↓ Download PDF
        </button>
      </div>

      <div className="border border-line bg-white rounded-2xl p-8 mb-6">
        <FairnessScale memberPct={memberPct} merchantPct={merchantPct} />

        <div className="mt-8 pt-6 border-t border-line text-center">
          <p className="label-eyebrow mb-1">Recommended outcome</p>
          <p className="font-display text-2xl">{outcomeLabel}</p>
          <p className="text-slate text-sm mt-1">
            {Math.round((decision.confidence ?? 0) * 100)}% confidence
          </p>
        </div>
      </div>

      <div className="border border-line bg-white rounded-2xl p-8">
        <p className="label-eyebrow mb-4">Why — reasoning trail</p>
        <ul className="space-y-3">
          {(decision.reasoning || []).map((r, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="font-mono text-slate shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span>{r}</span>
            </li>
          ))}
          {(!decision.reasoning || decision.reasoning.length === 0) && (
            <li className="text-slate text-sm">No reasoning returned yet.</li>
          )}
        </ul>
      </div>

      {scoring.signals && scoring.signals.length > 0 && (
        <div className="border border-line bg-white rounded-2xl p-8 mt-6">
          <p className="label-eyebrow mb-4">Signal weights</p>
          <div className="space-y-3">
            {scoring.signals.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.factor}</span>
                  <span
                    className={`font-mono text-xs ${
                      s.party === "cardMember" ? "text-member" : "text-merchant"
                    }`}
                  >
                    {s.party} · {Math.round(s.weight * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-line rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      s.party === "cardMember" ? "bg-member" : "bg-merchant"
                    }`}
                    style={{ width: `${s.weight * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/admin" className="text-gold underline text-sm">
          View all cases
        </Link>
      </div>
    </div>
  );
}
