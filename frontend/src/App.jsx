import { NavLink, Route, Routes } from 'react-router-dom';
import { useCart } from './context/CartContext.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailsPage from './pages/ProductDetailsPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { AccountPage, OrderDetailsPage } from './pages/AccountPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const { itemCount } = useCart();
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">ShopSmart</NavLink>
        <nav aria-label="Primary navigation">
          <NavLink to="/">Products</NavLink>
          <NavLink to="/assistant">AI Assistant</NavLink>
          <NavLink to="/cart">Cart ({itemCount})</NavLink>
          {user ? <NavLink to="/account">My account</NavLink> : <NavLink to="/login">Sign in</NavLink>}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders/:orderId" element={<OrderDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        ShopSmart · Classroom demo with fictional data only. Checkout is simulated and no payment is collected.
      </footer>
    </div>
  );
}
