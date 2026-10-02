import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Loader from "./components/Loader.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import { ProtectedRoute, AdminRoute, CreditRoute, ShopRoute } from "./components/ProtectedRoute.jsx";
import { useSiteSettings } from "./context/SiteSettingsContext.jsx";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Shop = lazy(() => import("./pages/Shop.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const ScanCapture = lazy(() => import("./pages/ScanCapture.jsx"));
const ScanOptions = lazy(() => import("./pages/ScanOptions.jsx"));
const ScanResult = lazy(() => import("./pages/ScanResult.jsx"));
const ScanHistoryPage = lazy(() => import("./pages/ScanHistory.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation.jsx"));
const OrderHistory = lazy(() => import("./pages/OrderHistory.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const Credits = lazy(() => import("./pages/Credits.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const Pricing = lazy(() => import("./pages/Pricing.jsx"));
const Terms = lazy(() => import("./pages/legal/Terms.jsx"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy.jsx"));
const Privacy = lazy(() => import("./pages/legal/Privacy.jsx"));
const Disclaimer = lazy(() => import("./pages/legal/Disclaimer.jsx"));
const Contact = lazy(() => import("./pages/legal/Contact.jsx"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers.jsx"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/AdminCustomerDetail.jsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.jsx"));
const AdminScans = lazy(() => import("./pages/admin/AdminScans.jsx"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments.jsx"));
const AdminChatLeads = lazy(() => import("./pages/admin/AdminChatLeads.jsx"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport.jsx"));

function App() {
  const { shopEnabled } = useSiteSettings();
  const inAdmin = useLocation().pathname.startsWith("/admin");
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      {shopEnabled && <CartDrawer />}
      <main className="flex-1">
        <Suspense fallback={<Loader full />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
            <Route path="support" element={<AdminSupport />} />
            <Route path="chat-leads" element={<AdminChatLeads />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      {!inAdmin && <Footer />}
      {!inAdmin && <ChatWidget />}
    </div>
  );
}

export default App;
