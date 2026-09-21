const levelStyles = {
  Low: { bar: "bg-emerald-500", badge: "badge-low" },
  Medium: { bar: "bg-amber-500", badge: "badge-medium" },
  High: { bar: "bg-rose-500", badge: "badge-high" },
};

const ConcernBar = ({ label, severity, level }) => {
  const style = levelStyles[level] || levelStyles.Low;
  return (
    <div className="flex items-center gap-4 py-2.5">
      <span className="w-28 shrink-0 text-sm font-medium text-slate-700">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${style.bar} transition-all duration-700`}
          style={{ width: `${severity}%` }}
        />
      </div>
      <span className={style.badge}>{level}</span>
    </div>
  );
};

export default ConcernBar;
