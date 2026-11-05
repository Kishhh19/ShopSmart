import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, '../data/db.json');

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Wireless Mouse', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', category: 'Accessories', emoji: '🖱️', price: 650, stock: 12, active: true },
  { id: 2, name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', emoji: '⌨️', price: 1850, stock: 8, active: true },
  { id: 3, name: 'USB-C Study Lamp', description: 'Adjustable desk lamp with three brightness levels.', category: 'Study', emoji: '💡', price: 900, stock: 10, active: true },
  { id: 4, name: '1080p Webcam', description: 'Full HD webcam with privacy cover and built-in microphone.', category: 'Video', emoji: '📷', price: 1450, stock: 6, active: true },
  { id: 5, name: 'Laptop Stand', description: 'Foldable aluminum stand for laptops up to 16 inches.', category: 'Study', emoji: '💻', price: 1200, stock: 9, active: true },
  { id: 6, name: 'USB Headset', description: 'Over-ear headset with noise-reducing boom microphone.', category: 'Audio', emoji: '🎧', price: 1350, stock: 7, active: true }
];

function loadData() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.products) && Array.isArray(data.orders)) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error reading db.json, using defaults:', error);
  }
  const initial = {
    products: DEFAULT_PRODUCTS.map((p) => ({ ...p })),
    orders: []
  };
  saveData(initial);
  return initial;
}

function saveData(data) {
  try {
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving db.json:', error);
  }
}

let store = loadData();

export const prisma = {
  product: {
    async findMany(args = {}) {
      store = loadData();
      let result = [...store.products];
      if (args.where) {
        if (typeof args.where.active === 'boolean') {
          result = result.filter((p) => (p.active ?? true) === args.where.active);
        }
        if (args.where.name?.contains) {
          const search = String(args.where.name.contains).toLowerCase();
          result = result.filter((p) => p.name.toLowerCase().includes(search));
        }
        if (args.where.description?.contains) {
          const search = String(args.where.description.contains).toLowerCase();
          result = result.filter((p) => p.description.toLowerCase().includes(search));
        }
        if (Array.isArray(args.where.OR) && args.where.OR.length > 0) {
          result = result.filter((p) => {
            return args.where.OR.some((condition) => {
              if (condition.name?.contains) {
                const search = String(condition.name.contains).toLowerCase();
                if (p.name.toLowerCase().includes(search)) return true;
              }
              if (condition.description?.contains) {
                const search = String(condition.description.contains).toLowerCase();
                if (p.description.toLowerCase().includes(search)) return true;
              }
              return false;
            });
          });
        }
        if (args.where.id?.in && Array.isArray(args.where.id.in)) {
          const ids = new Set(args.where.id.in);
          result = result.filter((p) => ids.has(p.id));
        }
      }
      if (args.orderBy) {
        if (args.orderBy.id === 'asc') result.sort((a, b) => a.id - b.id);
        else if (args.orderBy.id === 'desc') result.sort((a, b) => b.id - a.id);
        else if (args.orderBy.price === 'asc') result.sort((a, b) => Number(a.price) - Number(b.price));
        else if (args.orderBy.price === 'desc') result.sort((a, b) => Number(b.price) - Number(a.price));
      }
      return result.map((p) => ({ ...p }));
    },

    async findFirst(args = {}) {
      store = loadData();
      let result = [...store.products];
      if (args.where) {
        if (args.where.id !== undefined) {
          result = result.filter((p) => p.id === args.where.id);
        }
        if (typeof args.where.active === 'boolean') {
          result = result.filter((p) => (p.active ?? true) === args.where.active);
        }
      }
      return result.length > 0 ? { ...result[0] } : null;
    },

    async updateMany(args = {}) {
      store = loadData();
      let count = 0;
      store.products = store.products.map((product) => {
        let matches = true;
        if (args.where) {
          if (args.where.id !== undefined && product.id !== args.where.id) matches = false;
          if (args.where.stock?.gte !== undefined && product.stock < args.where.stock.gte) matches = false;
        }
        if (matches) {
          count++;
          const updated = { ...product };
          if (args.data?.stock?.decrement !== undefined) {
            updated.stock -= args.data.stock.decrement;
          }
          return updated;
        }
        return product;
      });
      if (count > 0) saveData(store);
      return { count };
    },

    async deleteMany() {
      store = loadData();
      const count = store.products.length;
      store.products = [];
      saveData(store);
      return { count };
    },

    async createMany(args = {}) {
      store = loadData();
      const data = args.data || [];
      let maxId = store.products.reduce((max, p) => Math.max(max, p.id || 0), 0);
      const created = data.map((item) => ({
        id: item.id || ++maxId,
        active: true,
        ...item
      }));
      store.products.push(...created);
      saveData(store);
      return { count: created.length };
    }
  },

  order: {
    async findMany(_args = {}) {
      store = loadData();
      return store.orders.map((o) => ({
        ...o,
        items: o.items ? o.items.map((i) => ({ ...i })) : []
      }));
    },

    async deleteMany() {
      store = loadData();
      const count = store.orders.length;
      store.orders = [];
      saveData(store);
      return { count };
    },

    async create(args = {}) {
      store = loadData();
      const { data, include } = args;
      let maxOrderId = store.orders.reduce((max, o) => Math.max(max, o.id || 0), 0);
      const newOrderId = ++maxOrderId;

      const allItems = store.orders.flatMap((o) => o.items || []);
      let maxItemId = allItems.reduce((max, i) => Math.max(max, i.id || 0), 0);

      const items = (data.items?.create || []).map((item) => ({
        id: ++maxItemId,
        orderId: newOrderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice)
      }));

      const newOrder = {
        id: newOrderId,
        customerName: data.customerName,
        email: data.email,
        address: data.address,
        status: data.status || 'PENDING',
        total: Number(data.total),
        createdAt: new Date().toISOString(),
        items
      };

      store.orders.push(newOrder);
      saveData(store);

      const result = { ...newOrder };
      if (!include?.items) {
        delete result.items;
      }
      return result;
    }
  },

  orderItem: {
    async deleteMany() {
      store = loadData();
      let count = 0;
      store.orders.forEach((o) => {
        count += (o.items || []).length;
        o.items = [];
      });
      saveData(store);
      return { count };
    }
  },

  async $transaction(callback) {
    return callback(prisma);
  },

  async $disconnect() {
    return Promise.resolve();
  }
};
