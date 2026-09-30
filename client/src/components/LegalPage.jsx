import { Link } from "react-router-dom";
import { COMPANY } from "../utils/company.js";

export const LEGAL_LINKS = [
  ["Pricing", "/pricing"],
  ["Terms & Conditions", "/terms"],
  ["Refund & Cancellation", "/refund-policy"],
  ["Privacy Policy", "/privacy"],
  ["Medical Disclaimer", "/disclaimer"],
  ["Contact Us", "/contact"],
];

// Shared shell for the policy pages: title, last-updated date, and sections.
export const LegalPage = ({ eyebrow, title, children }) => (
  <div className="fs-page fs-page-bg">
    <div className="container-app max-w-3xl py-12">
      <p className="fs-eyebrow">{eyebrow}</p>
      <h1 className="fs-page-title mt-3">{title}</h1>
      <p className="fs-page-sub">Last updated {COMPANY.updated}</p>
      <div className="card mt-8 space-y-8 rounded-3xl p-6 text-sm leading-relaxed text-slate-300 sm:p-8">{children}</div>
      <p className="mt-6 text-xs text-slate-500">
        Questions? <Link to="/contact" className="text-cyan-300 hover:underline">Contact us</Link>.
      </p>
    </div>
  </div>
);

export const Section = ({ title, children }) => (
  <section>
    <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
    <div className="mt-2 space-y-3">{children}</div>
  </section>
);

export const List = ({ items }) => (
  <ul className="list-disc space-y-1.5 pl-5 marker:text-cyan-300">
    {items.map((i) => <li key={i}>{i}</li>)}
  </ul>
);
