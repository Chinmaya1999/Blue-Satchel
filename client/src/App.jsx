import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import { ProtectedRoute, AdminRoute, CreditRoute, ShopRoute } from "./components/ProtectedRoute.jsx";
import { useSiteSettings } from "./context/SiteSettingsContext.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Shop from "./pages/Shop.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import ScanCapture from "./pages/ScanCapture.jsx";
import ScanOptions from "./pages/ScanOptions.jsx";
import ScanResult from "./pages/ScanResult.jsx";
import ScanHistoryPage from "./pages/ScanHistory.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import OrderHistory from "./pages/OrderHistory.jsx";
import Profile from "./pages/Profile.jsx";
import NotFound from "./pages/NotFound.jsx";
import Credits from "./pages/Credits.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import Pricing from "./pages/Pricing.jsx";
import Terms from "./pages/legal/Terms.jsx";
import RefundPolicy from "./pages/legal/RefundPolicy.jsx";
import Privacy from "./pages/legal/Privacy.jsx";
import Disclaimer from "./pages/legal/Disclaimer.jsx";
import Contact from "./pages/legal/Contact.jsx";

import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminCustomers from "./pages/admin/AdminCustomers.jsx";
import AdminCustomerDetail from "./pages/admin/AdminCustomerDetail.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminScans from "./pages/admin/AdminScans.jsx";
import AdminPayments from "./pages/admin/AdminPayments.jsx";

function App() {
  const { shopEnabled } = useSiteSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      {shopEnabled && <CartDrawer />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<ProtectedRoute allowUnverified><VerifyEmail /></ProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:id" element={<ProductDetail />} />

          {/* Scanning needs credits: without enough, these send you to /credits. */}
          <Route path="/scan" element={<ProtectedRoute><CreditRoute mode="any"><ScanOptions /></CreditRoute></ProtectedRoute>} />
          <Route path="/scan/detailed" element={<ProtectedRoute><CreditRoute mode="detailed"><ScanCapture /></CreditRoute></ProtectedRoute>} />
          <Route path="/scan/quick" element={<ProtectedRoute><CreditRoute mode="quick"><ScanCapture quick /></CreditRoute></ProtectedRoute>} />
          <Route path="/credits" element={<ProtectedRoute><Credits /></ProtectedRoute>} />
          <Route path="/scan/history" element={<ProtectedRoute><ScanHistoryPage /></ProtectedRoute>} />
          <Route path="/scan/:id" element={<ProtectedRoute><ScanResult /></ProtectedRoute>} />

          {/* Buying pages exist only while shop sales are switched on in admin. */}
          <Route path="/checkout" element={<ShopRoute><ProtectedRoute><Checkout /></ProtectedRoute></ShopRoute>} />
          <Route path="/order-confirmation/:id" element={<ShopRoute><ProtectedRoute><OrderConfirmation /></ProtectedRoute></ShopRoute>} />
          <Route path="/orders" element={<ShopRoute><ProtectedRoute><OrderHistory /></ProtectedRoute></ShopRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/admin/scan-report/:id" element={<AdminRoute><ScanResult admin /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<AdminCustomerDetail />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="scans" element={<AdminScans />} />
            <Route path="payments" element={<AdminPayments />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
