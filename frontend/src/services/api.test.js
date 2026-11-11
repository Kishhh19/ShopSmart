import { describe, expect, it, vi } from 'vitest';
import { api, NETWORK_ERROR_MESSAGE } from './api.js';

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

describe('api failure handling (DEF-05)', () => {
  it('turns a network failure into a useful message instead of "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.askAssistant('Which keyboard is below ₱2,000?')).rejects.toMatchObject({
      message: NETWORK_ERROR_MESSAGE,
      code: 'NETWORK_ERROR'
    });
    vi.unstubAllGlobals();
  });

  it('passes through request cancellation unchanged', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(api.getProducts('lamp')).rejects.toBe(abort);
    vi.unstubAllGlobals();
  });

  it('uses the API error message for a refused order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'INSUFFICIENT_STOCK', message: 'Only 6 unit(s) of 1080p Webcam are available.' } })
    }));
    await expect(api.createOrder({ items: [] })).rejects.toMatchObject({ status: 409, code: 'INSUFFICIENT_STOCK' });
    vi.unstubAllGlobals();
  });
});
