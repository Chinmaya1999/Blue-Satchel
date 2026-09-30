import { LegalPage, Section, List } from "../../components/LegalPage.jsx";
import { COMPANY } from "../../utils/company.js";

const Disclaimer = () => (
  <LegalPage eyebrow="Legal" title="Medical Disclaimer">
    <div className="rounded-2xl bg-amber-300/10 p-4 font-medium text-amber-100 ring-1 ring-amber-300/25">
      {COMPANY.brand} provides AI-generated skin analysis for informational and wellness purposes only. It is not a
      medical diagnosis, and it does not replace advice from a qualified doctor or dermatologist.
    </div>
    <Section title="What the analysis is">
      <p>
        Scores, concern maps and product suggestions are produced by software from a photograph. They estimate visible
        skin characteristics such as texture, hydration, tone and blemishes. Results can be affected by lighting,
        camera quality, makeup and image angle, and may be inaccurate.
      </p>
    </Section>
    <Section title="What it is not">
      <List items={[
        "It does not diagnose, treat, cure or prevent any disease or medical condition.",
        "It cannot detect skin cancer or other serious conditions.",
        "Product suggestions are not prescriptions or medical advice.",
      ]} />
    </Section>
    <Section title="When to see a doctor">
      <p>
        See a dermatologist or doctor if you have a changing mole, a sore that does not heal, persistent pain, bleeding,
        rapid changes in your skin, or any concern about your health. Never delay or ignore medical advice because of
        something in a scan report. In an emergency, contact local emergency services.
      </p>
    </Section>
    <Section title="Using products safely">
      <p>
        Patch test new products and check ingredients for allergies. Stop use if irritation occurs. If you are
        pregnant, nursing, on prescription treatment or have a skin condition, ask your doctor before starting a new
        routine.
      </p>
    </Section>
    <Section title="Contact">
      <p>{COMPANY.email}</p>
    </Section>
  </LegalPage>
);

export default Disclaimer;
