// The product's whole premise is "weigh both sides transparently" —
// so instead of a generic progress bar, this renders an actual balance
// scale: a horizontal beam that tips toward whichever side scored higher,
// with the split percentage labelled on each side.

export default function FairnessScale({ memberPct, merchantPct }) {
  const tiltDeg = Math.max(-8, Math.min(8, (memberPct - merchantPct) / 12.5));

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="label-eyebrow text-member">Card member · {memberPct}%</span>
        <span className="label-eyebrow text-merchant">Merchant · {merchantPct}%</span>
      </div>

      <div className="relative h-10 flex items-center">
        {/* fulcrum */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0 h-0
                     border-l-[7px] border-l-transparent
                     border-r-[7px] border-r-transparent
                     border-b-[10px] border-b-ink"
        />
        {/* beam */}
        <div
          className="w-full h-2 rounded-full overflow-hidden flex origin-center transition-transform duration-700 ease-out"
          style={{ transform: `rotate(${tiltDeg}deg)` }}
        >
          <div
            className="h-full bg-member transition-all duration-700"
            style={{ width: `${memberPct}%` }}
          />
          <div
            className="h-full bg-merchant transition-all duration-700"
            style={{ width: `${merchantPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
