import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Index } from "@/pages/Index";
import { Admin } from "@/pages/Admin";
import { Shop } from "@/pages/Shop";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/shop" element={<Shop />} />
      </Routes>
    </Router>
  );
}

export default App;