const STYLES = {
  submitted: "bg-goldSoft text-gold",
  evidence_pending: "bg-goldSoft text-gold",
  scoring: "bg-goldSoft text-gold",
  auto_resolve: "bg-memberSoft text-member",
  resolved: "bg-memberSoft text-member",
  needs_more_evidence: "bg-[#FCEFD9] text-[#8A5A0A]",
  escalate_to_human: "bg-merchantSoft text-merchant",
  escalated: "bg-merchantSoft text-merchant",
};

const LABELS = {
  submitted: "Submitted",
  evidence_pending: "Evidence pending",
  scoring: "Scoring",
  auto_resolve: "Auto-resolved",
  resolved: "Resolved",
  needs_more_evidence: "Needs more evidence",
  escalate_to_human: "Escalated to reviewer",
  escalated: "Escalated to reviewer",
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || "bg-line text-slate";
  const label = LABELS[status] || status;
  return (
    <span
      className={`label-eyebrow inline-flex items-center px-2.5 py-1 rounded-full ${style}`}
    >
      {label}
    </span>
  );
}
