export function filterProductsByCategory(products, category = 'All') {
  if (!Array.isArray(products)) return [];
  if (category === 'All') return [...products];
  return products.filter((p) => p.category === category);
}

export function sortProducts(products, sortBy = 'default') {
  if (!Array.isArray(products)) return [];
  const list = [...products];
  if (sortBy === 'price-asc') {
    list.sort((a, b) => Number(a.price) - Number(b.price) || a.id - b.id);
  } else if (sortBy === 'price-desc') {
    list.sort((a, b) => Number(b.price) - Number(a.price) || a.id - b.id);
  } else {
    list.sort((a, b) => a.id - b.id);
  }
  return list;
}

export function extractCategories(products, existingCategories = ['All']) {
  const currentSet = new Set(existingCategories);
  if (Array.isArray(products)) {
    for (const p of products) {
      if (p.category) currentSet.add(p.category);
    }
  }
  return ['All', ...Array.from(currentSet).filter((c) => c !== 'All')];
}
