import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { LegalPage, Section } from "../../components/LegalPage.jsx";
import { COMPANY } from "../../utils/company.js";

const Contact = () => {
  const rows = [
    [Mail, "Email", COMPANY.email, `mailto:${COMPANY.email}`],
    [Phone, "Phone", COMPANY.phone, `tel:${COMPANY.phone.replace(/\s/g, "")}`],
    [MapPin, "Address", COMPANY.address],
    [Clock, "Support hours", COMPANY.hours],
  ];
  return (
    <LegalPage eyebrow="Support" title="Contact Us">
      <p>
        Need help with a scan, a payment or your data? Reach {COMPANY.legalName} using any of the details below. We
        reply within 2 working days.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map(([Icon, label, value, href]) => (
          <div key={label} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/30">
              <Icon size={18} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              {href ? <a href={href} className="text-white hover:text-cyan-300">{value}</a> : <p className="text-white">{value}</p>}
            </div>
          </div>
        ))}
      </div>
      <Section title="For payment issues">
        <p>Include your registered email and the Razorpay payment ID from your Credit history so we can help faster.</p>
      </Section>
    </LegalPage>
  );
};

export default Contact;
