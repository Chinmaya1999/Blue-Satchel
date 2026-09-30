import { LegalPage, Section, List } from "../../components/LegalPage.jsx";
import { COMPANY } from "../../utils/company.js";

const Privacy = () => (
  <LegalPage eyebrow="Legal" title="Privacy Policy">
    <Section title="Overview">
      <p>
        This policy explains what {COMPANY.legalName} ("{COMPANY.brand}") collects, why, and the choices you have. Skin
        photos and scan results are sensitive, so we collect them only to give you your analysis.
      </p>
    </Section>
    <Section title="What we collect">
      <List items={[
        "Account details: name, email, phone number and password (stored hashed), or your Google profile if you sign in with Google.",
        "Skin photos: the face photos you capture or upload for a scan.",
        "Scan data: scores, concern maps, skin type and recommendations generated from your photos.",
        "Payment records: plan bought, amount, and Razorpay order and payment IDs. Card, UPI and bank details go to Razorpay only.",
        "Order and delivery details if you buy from the shop.",
        "Technical data: device, browser and basic usage logs for security and debugging.",
      ]} />
    </Section>
    <Section title="How we use skin photos and scan data">
      <List items={[
        "To run the analysis you requested and show you the report and your scan history.",
        "To suggest products and a routine for your skin.",
        "We do not sell your photos or scan data, and we do not use them for advertising.",
        "We do not use your photos to train AI models without your separate, explicit consent.",
        "Face mapping runs in your browser; the photo is uploaded to our servers to produce and store your report.",
      ]} />
    </Section>
    <Section title="Storage, security and retention">
      <p>
        Photos and scans are stored on secured servers, transmitted over HTTPS, and visible only to you and authorised
        staff who need access to provide support. We keep them until you delete a scan or your account. On request we
        delete your photos and scan data within 30 days, except records we must keep by law (such as payment records).
      </p>
    </Section>
    <Section title="Who we share data with">
      <List items={[
        "Razorpay, to process payments.",
        "Cloud hosting, storage and AI analysis providers acting on our instructions to run the service.",
        "Delivery partners, for shop orders.",
        "Authorities, only when legally required.",
      ]} />
    </Section>
    <Section title="Your rights">
      <p>
        You can view your scans in Scan history, delete them, update your profile, withdraw consent, and ask us for a
        copy or deletion of your data. Email {COMPANY.email} and we will respond within 30 days.
      </p>
    </Section>
    <Section title="Cookies">
      <p>We use only essential storage (login session, cart) needed for the site to work.</p>
    </Section>
    <Section title="Children">
      <p>The service is not intended for people under 18 without a parent or guardian's consent.</p>
    </Section>
    <Section title="Changes and contact">
      <p>
        We will update the date above when this policy changes. Contact: {COMPANY.email}, {COMPANY.phone}, {COMPANY.address}.
      </p>
    </Section>
  </LegalPage>
);

export default Privacy;
