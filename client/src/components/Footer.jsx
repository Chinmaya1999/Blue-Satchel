import Logo from "./Logo.jsx";

const Footer = () => (
  <footer className="mt-20 border-t border-slate-100 bg-white">
    <div className="container-app py-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Mobile-first AI skin diagnostics, personalized skincare recommendations, and seamless commerce.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Blue Satchel · Proof of Concept build for demonstration purposes.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
