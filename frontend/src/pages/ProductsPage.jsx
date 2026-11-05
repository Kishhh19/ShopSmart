import { useEffect, useMemo, useRef, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';
import { extractCategories, filterProductsByCategory, sortProducts } from '../utils/catalog.js';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [sortBy, setSortBy] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryTrigger, setRetryTrigger] = useState(0);

  const { addToCart, cartMessage } = useCart();
  const latestRequestId = useRef(0);
  const isFirstMount = useRef(true);

  // Derive stable category options from an initial catalog fetch
  useEffect(() => {
    let active = true;
    api.getProducts('')
      .then((data) => {
        if (active && Array.isArray(data?.products)) {
          setCategories(extractCategories(data.products));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Request catalog when search or retryTrigger changes
  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++latestRequestId.current;

    const runFetch = () => {
      setLoading(true);
      setError('');
      api.getProducts(search, { signal: controller.signal })
        .then((data) => {
          if (requestId === latestRequestId.current) {
            const list = data?.products || [];
            setProducts(list);
            setLoading(false);
            if (list.length > 0) {
              setCategories((prev) => extractCategories(list, prev));
            }
          }
        })
        .catch((caught) => {
          if (caught.name === 'AbortError') return;
          if (requestId === latestRequestId.current) {
            setError(caught.message || 'Unable to load products. Please try again.');
            setProducts([]);
            setLoading(false);
          }
        });
    };

    let timer;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      runFetch();
    } else {
      setLoading(true);
      timer = setTimeout(runFetch, 250);
    }

    return () => {
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [search, retryTrigger]);

  const filteredProducts = useMemo(() => {
    return filterProductsByCategory(products, category);
  }, [products, category]);

  const visibleProducts = useMemo(() => {
    return sortProducts(filteredProducts, sortBy);
  }, [filteredProducts, sortBy]);

  return (
    <section>
      <div className="hero">
        <div>
          <h1>ShopSmart</h1>
          <p>Discover quality tech essentials for study, work, and play.</p>
        </div>
      </div>

      <div className="toolbar">
        <label>
          <span>Search products</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Try keyboard or privacy"
          />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="default">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </label>
      </div>

      <StatusMessage>{cartMessage}</StatusMessage>
      {loading && <StatusMessage>Loading products…</StatusMessage>}
      {error && (
        <StatusMessage type="error">
          <span style={{ marginRight: '0.75rem' }}>{error} Make sure the backend is running.</span>
          <button
            type="button"
            className="button secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.875rem' }}
            onClick={() => setRetryTrigger((count) => count + 1)}
          >
            Retry
          </button>
        </StatusMessage>
      )}
      {!loading && !error && visibleProducts.length === 0 && (
        <StatusMessage>No products found. Try another search term or category.</StatusMessage>
      )}

      {!loading && !error && visibleProducts.length > 0 && (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </div>
      )}
    </section>
  );
}
