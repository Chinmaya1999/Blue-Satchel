import { LegalPage, Section, List } from "../../components/LegalPage.jsx";
import { COMPANY } from "../../utils/company.js";

const Terms = () => (
  <LegalPage eyebrow="Legal" title="Terms & Conditions">
    <Section title="1. About these terms">
      <p>
        These terms govern your use of the {COMPANY.brand} website and services, operated by {COMPANY.legalName}
        ("we", "us"). By creating an account, buying credits or running a scan you agree to them. If you do not agree,
        please do not use the service.
      </p>
    </Section>
    <Section title="2. The service">
      <p>
        {COMPANY.brand} lets you take a photo of your face and receive an AI-generated skin analysis with scores,
        concern maps and product suggestions. The analysis is for general wellness and informational purposes only. It
        is <b>not a medical diagnosis</b>; see our Medical Disclaimer.
      </p>
    </Section>
    <Section title="3. Eligibility and accounts">
      <List items={[
        "You must be at least 18 years old, or use the service with a parent or guardian's consent.",
        "You must provide accurate information and keep your login details confidential.",
        "You are responsible for all activity on your account.",
      ]} />
    </Section>
    <Section title="4. Scan credits and payments">
      <p>
        Scans are paid for with prepaid credits, bought as one-time packs on our Pricing page. Prices are shown before
        you pay and are inclusive of applicable taxes unless stated otherwise. Payments are processed by Razorpay; we
        never see or store your card or UPI details. Credits are added to your account once the payment is confirmed
        and do not expire. Credits have no cash value and cannot be transferred or exchanged for money except as set
        out in our Refund & Cancellation Policy.
      </p>
      <p>We do not sell recurring subscriptions, so there is nothing to auto-renew or cancel.</p>
    </Section>
    <Section title="5. Acceptable use">
      <List items={[
        "Upload only photos of yourself, or of someone who has given you their consent.",
        "Do not misuse, reverse-engineer, scrape or overload the service.",
        "Do not use the service for unlawful purposes or to harm others.",
      ]} />
    </Section>
    <Section title="6. Products and shop">
      <p>
        Skincare products shown on the site are suggestions. Check ingredients for allergies, patch test before use,
        and stop using a product that irritates your skin.
      </p>
    </Section>
    <Section title="7. Intellectual property">
      <p>
        The site, its design, software and reports are owned by us or our licensors. You keep ownership of the photos
        you upload and grant us a limited licence to process them solely to provide the service to you.
      </p>
    </Section>
    <Section title="8. Limitation of liability">
      <p>
        The service is provided "as is". To the extent permitted by law, we are not liable for indirect or
        consequential loss, or for decisions you make based on a scan result. Our total liability for any claim is
        limited to the amount you paid us in the 12 months before the claim.
      </p>
    </Section>
    <Section title="9. Suspension and termination">
      <p>
        We may suspend accounts that breach these terms. You may delete your account at any time by contacting us.
      </p>
    </Section>
    <Section title="10. Changes, governing law and contact">
      <p>
        We may update these terms and will change the date above when we do. These terms are governed by the laws of
        India and the courts of the city in our registered address have jurisdiction. Contact: {COMPANY.email}.
      </p>
    </Section>
  </LegalPage>
);

export default Terms;
