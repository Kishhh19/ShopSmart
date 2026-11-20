const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const NETWORK_ERROR_MESSAGE = 'Could not reach the ShopSmart API. Check that the backend is running, then try again.';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      // Sends the HTTP-only session cookie; the browser never reads the token itself.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch (caught) {
    // Keep cancellations distinguishable so pages can ignore them.
    if (caught?.name === 'AbortError') throw caught;
    // fetch rejects with a bare "Failed to fetch" TypeError when the API is down or blocked by CORS.
    const error = new Error(NETWORK_ERROR_MESSAGE);
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export const api = {
  getProducts: (query = '', options = {}) => {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    const params = new URLSearchParams();
    if (trimmed) {
      params.set('search', trimmed);
    }
    const queryString = params.toString();
    return request(`/products${queryString ? `?${queryString}` : ''}`, options);
  },
  getProduct: (id, options = {}) => request(`/products/${id}`, options),
  createOrder: (order, options = {}) => request('/orders', { method: 'POST', body: JSON.stringify(order), ...options }),
  register: (account) => request('/auth/register', { method: 'POST', body: JSON.stringify(account) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: (options = {}) => request('/auth/me', options),
  getMyOrders: (options = {}) => request('/orders', options),
  getOrder: (id, options = {}) => request(`/orders/${id}`, options),
  askAssistant: (question, options = {}) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question }), ...options
  })
};
