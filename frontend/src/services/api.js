const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });

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
  askAssistant: (question, options = {}) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question }), ...options
  })
};
