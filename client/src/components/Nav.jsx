import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `label-eyebrow px-3 py-2 border-b-2 transition-colors ${
    isActive
      ? "border-gold text-ink"
      : "border-transparent text-slate hover:text-ink"
  }`;

export default function Nav() {
  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl italic">Resolve</span>
          <span className="label-eyebrow hidden sm:inline">
            every dispute, fairly weighed
          </span>
        </div>
        <nav className="flex gap-1">
          <NavLink to="/" end className={linkClass}>File dispute</NavLink>
          <NavLink to="/evidence" className={linkClass}>Submit evidence</NavLink>
          <NavLink to="/admin" className={linkClass}>Case queue</NavLink>
        </nav>
      </div>
    </header>
  );
}
