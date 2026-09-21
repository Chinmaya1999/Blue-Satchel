const ScoreRing = ({ score = 0, label = "", size = 168, stroke = 14 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  const color = progress >= 80 ? "#10b981" : progress >= 60 ? "#3366ff" : progress >= 40 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#eef2f9" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1), stroke 0.6s" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-extrabold text-slate-900">{Math.round(progress)}</span>
        <span className="text-xs font-medium text-slate-400">/100</span>
        {label && <span className="mt-1 text-sm font-semibold" style={{ color }}>{label}</span>}
      </div>
    </div>
  );
};

export default ScoreRing;
