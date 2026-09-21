const Loader = ({ label = "Loading…", full = false }) => (
  <div className={`flex flex-col items-center justify-center gap-3 ${full ? "min-h-[60vh]" : "py-16"}`}>
    <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
    <p className="text-sm font-medium text-slate-400">{label}</p>
  </div>
);

export default Loader;
