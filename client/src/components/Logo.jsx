// DXB BEAUTY mark (public/logo-mark.png) plus the name set in live text, so
// the wordmark stays readable on both the dark site and light pages.
const Logo = ({ light = false, size = "md" }) => {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  const marks = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" };
  return (
    <div className="flex items-center gap-2 select-none">
      <img src="/logo-mark.png" alt="" className={`${marks[size]} object-contain`} />
      <span className={`font-display font-bold tracking-tight ${sizes[size]} ${light ? "text-white" : "text-brand-900"}`}>
        DXB BEAUTY
      </span>
    </div>
  );
};

export default Logo;
