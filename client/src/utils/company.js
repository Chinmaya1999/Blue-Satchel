// Business details shown on the Contact, Terms, Privacy and Refund pages.
// Razorpay compares these with the KYC documents, so they must match exactly.
// Set them in client/.env (VITE_COMPANY_*) or edit the fallbacks below.
const env = import.meta.env;

export const COMPANY = {
  brand: "DXB BEAUTY",
  legalName: env.VITE_COMPANY_LEGAL_NAME || "DXB BEAUTY (legal entity name as per KYC)",
  email: env.VITE_COMPANY_EMAIL || "Pradipta@uuoinnovation.com",
  phone: env.VITE_COMPANY_PHONE || "+91 82968 10381",
  whatsapp: env.VITE_COMPANY_WHATSAPP || "+91 82968 10381",
  address:
    env.VITE_COMPANY_ADDRESS ||
    "Shop No. 8, Shri Balaji, KKR Complex, 1st Floor, Opposite SCT College, Kaggadasapura, Bangalore - 560075",
  hours: "Monday to Saturday, 10:00 AM to 6:00 PM IST",
  updated: "30 September 2026",
};
