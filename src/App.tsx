import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Lazy load route components for code splitting
const Index = lazy(() => import("@/pages/Index").then(module => ({ default: module.Index })));
const Admin = lazy(() => import("@/pages/Admin").then(module => ({ default: module.Admin })));
const Shop = lazy(() => import("@/pages/Shop"));
const Auth = lazy(() => import("@/pages/Auth").then(module => ({ default: module.Auth })));
const TelegramShop = lazy(() => import("@/pages/TelegramShop").then(module => ({ default: module.TelegramShop })));

function App() {
  return (
    <Router>
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/telegram-shop" element={<TelegramShop />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;