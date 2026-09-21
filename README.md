# Blue Satchel — AI Skin Diagnostics Platform (MERN)

A working implementation of the Blue Satchel POC scope (Section 5 of the proposal) built on the
**MERN** stack (MongoDB, Express, React, Node.js) as a responsive web app.

## What's implemented

- **Auth** — JWT registration/login, profile management, address book, in-app notifications.
- **AI Skin Diagnostics** — real pixel-level analysis (`server/src/services/aiDiagnosticsService.js`)
  using `sharp` to sample facial regions and score Spots, Pores, Texture, Redness and Dark Circles,
  plus an overall 0–100 skin health score. It's a heuristic placeholder behind a stable interface —
  swap in a real vendor (Perfect Corp, Haut.AI, etc.) without touching any calling code.
- **Recommendation Engine** — rule-based matching from concern severity + skin type to the product
  catalogue (`server/src/services/recommendationEngine.js`).
- **E-commerce** — product catalogue with filters, cart, checkout with card/UPI/COD (mock payment
  gateway with real Luhn/expiry validation), order history, stock decrement.
- **CRM Integration Point** — `crmService.js` syncs customers/orders to an auditable `CRMSyncLog`
  collection, viewable in the admin console, matching Zoho CRM's contact/deal model.
- **Internal Operations Console** (`/admin`) — dashboard, customer lookup + scan history per
  customer, product CRUD, order management with status updates.

## Project structure

```
server/   Express + MongoDB API (business platform)
client/   React + Vite + Tailwind (consumer web app + admin console)
```

## Getting started

### 1. Backend

```bash
cd server
cp .env.example .env   # then edit MONGO_URI if not using local Mongo
npm install
npm run seed            # creates products + admin user (admin@bluesatchel.com / Admin@123)
npm run dev              # http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev               # http://localhost:5173 (proxies /api to :5000)
```

Requires a running MongoDB instance (local or Atlas) reachable via `MONGO_URI` in `server/.env`.

## Swappable enterprise integrations

Per the proposal's "Technology Integration First" principle, the AI diagnostics, CRM and payment
gateway are implemented as isolated services with a stable function contract so they can be swapped
for real vendor SDKs without changing controllers or routes:

- `services/aiDiagnosticsService.js` → `analyzeSkin(buffer)`
- `services/crmService.js` → `syncCustomer(user)`, `syncOrder(order, user)`
- `services/paymentService.js` → `chargePayment({ method, amount, card, upiId })`

## Notes on scope

Built as a responsive React web app rather than React Native, since "MERN" specifies the web stack.
Push notifications (Firebase) and Google Maps clinic discovery from the proposal's Section 5.3 are
out of scope here as they require live vendor credentials — the in-app notification center covers
the same user-facing need for this POC.
