import { LegalPage, Section, List } from "../../components/LegalPage.jsx";
import { COMPANY } from "../../utils/company.js";

const RefundPolicy = () => (
  <LegalPage eyebrow="Legal" title="Refund & Cancellation Policy">
    <Section title="How billing works">
      <p>
        {COMPANY.brand} sells prepaid scan-credit packs as a <b>one-time purchase</b>. There is no subscription and no
        recurring billing, so you will never be charged automatically. Nothing needs to be cancelled to stop paying:
        simply do not buy another pack.
      </p>
    </Section>
    <Section title="Cancelling an order">
      <p>
        A payment that has not been completed is not charged and can be abandoned at any time. Once a payment succeeds
        the credits are added immediately. You can ask us to cancel and refund a pack within <b>7 days</b> of purchase
        if none of its credits have been used.
      </p>
    </Section>
    <Section title="Refund eligibility">
      <List items={[
        "Unused credit packs: full refund if requested within 7 days of purchase.",
        "Partly used packs: no refund for credits already spent on scans.",
        "Failed scans: if a scan's analysis fails, its credits are returned to your balance automatically.",
        "Duplicate or wrongly charged payments: refunded in full once verified.",
        "Payment deducted but credits not added: we will add the credits or refund you within 5 working days.",
      ]} />
    </Section>
    <Section title="How to request a refund">
      <p>
        Email {COMPANY.email} or call {COMPANY.phone} ({COMPANY.hours}) with your registered email and the payment
        reference from your Credit history. We reply within 2 working days.
      </p>
    </Section>
    <Section title="Refund timeline">
      <p>
        Approved refunds are sent to the original payment method through Razorpay and normally reach your account in
        5 to 7 working days, depending on your bank.
      </p>
    </Section>
    <Section title="Deleting your account">
      <p>
        You may ask us to close your account and delete your data at any time. Remaining credits are forfeited on
        deletion unless they are eligible for a refund under this policy.
      </p>
    </Section>
  </LegalPage>
);

export default RefundPolicy;
