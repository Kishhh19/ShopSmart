import { describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

describe('api service', () => {
  it('requests /products with no query parameter when search is empty or whitespace', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getProducts('');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/products', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' }
    }));

    await api.getProducts('   ');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/products', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' }
    }));

    vi.unstubAllGlobals();
  });

  it('requests /products?search=<term> properly trimmed and encoded', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getProducts('keyboard');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/products?search=keyboard', expect.anything());

    await api.getProducts('  privacy  ');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/products?search=privacy', expect.anything());

    await api.getProducts('usb & cable');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/products?search=usb+%26+cable', expect.anything());

    vi.unstubAllGlobals();
  });

  it('forwards optional signal to fetch for cancellation', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getProducts('lamp', { signal: controller.signal });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/products?search=lamp',
      expect.objectContaining({ signal: controller.signal })
    );

    vi.unstubAllGlobals();
  });
});
