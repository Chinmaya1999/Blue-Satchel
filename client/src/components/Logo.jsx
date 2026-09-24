import { Briefcase } from "lucide-react";

const Logo = ({ light = false, size = "md" }) => {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <div className="flex items-center gap-2 select-none">
      <span
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${
          light
            ? "bg-gradient-to-br from-cyan-300 to-indigo-500 text-slate-950 shadow-[0_0_24px_-4px_rgba(94,231,255,0.7)]"
            : "bg-brand-600 text-white"
        }`}
      >
        <Briefcase size={16} strokeWidth={2.4} />
      </span>
      <span className={`font-display font-bold tracking-tight ${sizes[size]} ${light ? "text-white" : "text-brand-900"}`}>
        Blue Satchel
      </span>
    </div>
  );
};

export default Logo;
