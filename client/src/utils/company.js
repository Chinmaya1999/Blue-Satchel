// Business details shown on the Contact, Terms, Privacy and Refund pages.
// Razorpay compares these with the KYC documents, so they must match exactly.
// Set them in client/.env (VITE_COMPANY_*) or edit the fallbacks below.
const env = import.meta.env;

export const COMPANY = {
  brand: "Blue Satchel",
  legalName: env.VITE_COMPANY_LEGAL_NAME || "Blue Satchel (legal entity name as per KYC)",
  email: env.VITE_COMPANY_EMAIL || "support@example.com",
  phone: env.VITE_COMPANY_PHONE || "+91 00000 00000",
  address: env.VITE_COMPANY_ADDRESS || "Registered business address as per KYC, City, State, PIN, India",
  hours: "Monday to Saturday, 10:00 AM to 6:00 PM IST",
  updated: "30 September 2026",
};
