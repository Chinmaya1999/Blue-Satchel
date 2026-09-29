// Loads Razorpay Checkout (checkout.razorpay.com) once, on first use.
// Resolves false if the script can't be loaded (offline, blocked).
let checkoutScript;

export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  checkoutScript ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => {
      checkoutScript = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return checkoutScript;
};
