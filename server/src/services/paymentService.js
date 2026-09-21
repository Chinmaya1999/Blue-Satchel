/**
 * Payment Gateway Service (Section 5.3 / 6 "Payment Gateway")
 * charge({ method, amount, card }) -> { success, reference, message }
 * Implements real card-number validation (Luhn checksum) and expiry checks
 * against a simulated authorization step, so the checkout flow behaves like
 * a genuine gateway integration point without needing live vendor keys.
 */
const luhnCheck = (num) => {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 12) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const isExpiryValid = (expiry) => {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry || "");
  if (!match) return false;
  const [, mm, yy] = match;
  const month = parseInt(mm, 10);
  if (month < 1 || month > 12) return false;
  const expDate = new Date(2000 + parseInt(yy, 10), month, 0, 23, 59, 59);
  return expDate >= new Date();
};

const generateReference = () =>
  `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export const chargePayment = async ({ method, amount, card, upiId }) => {
  if (amount <= 0) return { success: false, message: "Invalid order amount." };

  if (method === "cod") {
    return { success: true, reference: generateReference(), message: "Order placed with Cash on Delivery." };
  }

  if (method === "upi") {
    const valid = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId || "");
    if (!valid) return { success: false, message: "Enter a valid UPI ID (e.g. name@bank)." };
    return { success: true, reference: generateReference(), message: "UPI payment authorized." };
  }

  // card
  if (!card?.number || !luhnCheck(card.number)) {
    return { success: false, message: "Card number failed validation." };
  }
  if (!isExpiryValid(card.expiry)) {
    return { success: false, message: "Card has expired or expiry is invalid." };
  }
  if (!/^\d{3,4}$/.test(card.cvv || "")) {
    return { success: false, message: "Invalid CVV." };
  }

  return { success: true, reference: generateReference(), message: "Card payment authorized." };
};
