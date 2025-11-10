import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Index } from "@/pages/Index";
import { Admin } from "@/pages/Admin";
import { Shop } from "@/pages/Shop";
import { Auth } from "@/pages/Auth";
import { TelegramShop } from "@/pages/TelegramShop";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/telegram-shop" element={<TelegramShop />} />
      </Routes>
    </Router>
  );
}

export default App;