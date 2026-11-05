import { describe, expect, it } from 'vitest';
import {
  extractCategories,
  filterProductsByCategory,
  sortProducts
} from './catalog.js';

const sampleProducts = [
  { id: 1, name: 'Wireless Mouse', category: 'Accessories', price: 650 },
  { id: 2, name: 'Compact Mechanical Keyboard', category: 'Accessories', price: 1850 },
  { id: 3, name: 'USB-C Study Lamp', category: 'Study', price: 900 },
  { id: 4, name: '1080p Webcam', category: 'Video', price: 1450 }
];

describe('catalog utilities', () => {
  it('filters products by category', () => {
    const studyProducts = filterProductsByCategory(sampleProducts, 'Study');
    expect(studyProducts).toHaveLength(1);
    expect(studyProducts[0].name).toBe('USB-C Study Lamp');

    const allProducts = filterProductsByCategory(sampleProducts, 'All');
    expect(allProducts).toHaveLength(4);

    const emptyCategory = filterProductsByCategory(sampleProducts, 'Audio');
    expect(emptyCategory).toHaveLength(0);
  });

  it('sorts products numerically by price ascending', () => {
    const sorted = sortProducts(sampleProducts, 'price-asc');
    expect(sorted.map((p) => p.price)).toEqual([650, 900, 1450, 1850]);
  });

  it('sorts products numerically by price descending', () => {
    const sorted = sortProducts(sampleProducts, 'price-desc');
    expect(sorted.map((p) => p.price)).toEqual([1850, 1450, 900, 650]);
  });

  it('does not mutate the original products array when sorting', () => {
    const originalCopy = [...sampleProducts];
    sortProducts(sampleProducts, 'price-desc');
    expect(sampleProducts).toEqual(originalCopy);
  });

  it('breaks ties deterministically using product id', () => {
    const tiedProducts = [
      { id: 10, name: 'Item B', price: 500 },
      { id: 5, name: 'Item A', price: 500 }
    ];
    const sorted = sortProducts(tiedProducts, 'price-asc');
    expect(sorted[0].id).toBe(5);
    expect(sorted[1].id).toBe(10);
  });

  it('extracts stable unique category options with "All" first', () => {
    const categories = extractCategories(sampleProducts);
    expect(categories).toEqual(['All', 'Accessories', 'Study', 'Video']);

    // Retains existing categories even when input has fewer products
    const retained = extractCategories([{ id: 1, category: 'Audio' }], categories);
    expect(retained).toContain('All');
    expect(retained).toContain('Accessories');
    expect(retained).toContain('Study');
    expect(retained).toContain('Video');
    expect(retained).toContain('Audio');
  });
});
