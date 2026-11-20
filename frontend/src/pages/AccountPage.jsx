import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const peso = (value) => `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function useSignedIn() {
  const { user, checking } = useAuth();
  if (checking) return { state: 'checking' };
  if (!user) return { state: 'guest' };
  return { state: 'user', user };
}

export function AccountPage() {
  const auth = useSignedIn();
  const { logout } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth.state !== 'user') return undefined;
    const controller = new AbortController();
    api.getMyOrders({ signal: controller.signal })
      .then((data) => setOrders(data.orders))
      .catch((caught) => { if (caught.name !== 'AbortError') setError(caught.message); });
    return () => controller.abort();
  }, [auth.state]);

  if (auth.state === 'checking') return <p role="status">Checking your session…</p>;
  if (auth.state === 'guest') return <Navigate to="/login?next=/account" replace />;

  return (
    <section>
      <div className="page-heading account-heading">
        <div><p className="eyebrow">MY ACCOUNT</p><h1>{auth.user.name}</h1><p>{auth.user.email}</p></div>
        <button className="button secondary" onClick={logout}>Sign out</button>
      </div>
      <h2>My simulated orders</h2>
      <StatusMessage type="error">{error}</StatusMessage>
      {!orders && !error && <p role="status">Loading orders…</p>}
      {orders && orders.length === 0 && <div className="empty-state"><p>No orders yet.</p><Link className="button" to="/">Browse products</Link></div>}
      {orders && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <Link key={order.id} className="order-row" to={`/account/orders/${order.id}`}>
              <strong>Order #{order.id}</strong>
              <span>{new Date(order.createdAt).toLocaleString('en-PH')}</span>
              <span>{order.items.length} item(s)</span>
              <strong>{peso(order.total)}</strong>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function OrderDetailsPage() {
  const auth = useSignedIn();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth.state !== 'user') return undefined;
    const controller = new AbortController();
    setOrder(null); setError('');
    api.getOrder(orderId, { signal: controller.signal })
      .then(setOrder)
      .catch((caught) => { if (caught.name !== 'AbortError') setError(caught.message); });
    return () => controller.abort();
  }, [auth.state, orderId]);

  if (auth.state === 'checking') return <p role="status">Checking your session…</p>;
  if (auth.state === 'guest') return <Navigate to={`/login?next=/account/orders/${orderId}`} replace />;

  return (
    <section>
      <Link to="/account">← Back to my orders</Link>
      <StatusMessage type="error">{error}</StatusMessage>
      {!order && !error && <p role="status">Loading order…</p>}
      {order && (
        <div className="summary order-details">
          <p className="eyebrow">SIMULATED ORDER</p>
          <h1>Order #{order.id}</h1>
          <p><span>Status</span><strong>{order.status}</strong></p>
          <p><span>Deliver to</span><span>{order.customerName}, {order.address}</span></p>
          {order.items.map((item) => (
            <p key={item.id}><span>{item.productName || `Product #${item.productId}`} × {item.quantity}</span><span>{peso(item.unitPrice * item.quantity)}</span></p>
          ))}
          <p className="summary-total"><span>Total</span><strong>{peso(order.total)}</strong></p>
        </div>
      )}
    </section>
  );
}
