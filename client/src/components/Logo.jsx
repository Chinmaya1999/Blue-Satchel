import { Briefcase } from "lucide-react";

const Logo = ({ light = false, size = "md" }) => {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  return (
    <div className="flex items-center gap-2 select-none">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          light ? "bg-white/15 text-white" : "bg-brand-600 text-white"
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
