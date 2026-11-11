import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

const products = [
  { id: 1, name: 'Wireless Mouse', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', category: 'Accessories', emoji: '🖱️', price: 650, stock: 12 },
  { id: 2, name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', emoji: '⌨️', price: 1850, stock: 8 },
  { id: 3, name: 'USB-C Study Lamp', description: 'Adjustable desk lamp with three brightness levels.', category: 'Study', emoji: '💡', price: 900, stock: 10 },
  { id: 4, name: '1080p Webcam', description: 'Full HD webcam with privacy cover and built-in microphone.', category: 'Video', emoji: '📷', price: 1450, stock: 6 },
  { id: 5, name: 'Laptop Stand', description: 'Foldable aluminum stand for laptops up to 16 inches.', category: 'Study', emoji: '💻', price: 1200, stock: 9 },
  { id: 6, name: 'USB Headset', description: 'Over-ear headset with noise-reducing boom microphone.', category: 'Audio', emoji: '🎧', price: 1350, stock: 7 }
];

async function main() {
  // The seed replaces all products and deletes all orders. Refuse to do that by
  // accident: it only runs on an empty order table unless SEED_RESET=true is set.
  const existingOrders = await prisma.order.count();
  if (existingOrders > 0 && process.env.SEED_RESET !== 'true') {
    console.error(`Seed stopped: the database already contains ${existingOrders} order(s). ` +
      'Reseeding would delete them. Set SEED_RESET=true only if you intend to wipe this data.');
    process.exitCode = 1;
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('Seed stopped: never reseed a production or staging database with NODE_ENV=production.');
    process.exitCode = 1;
    return;
  }
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: products });
  // Explicit ids keep product links (/products/1) stable across reseeds. Move the
  // PostgreSQL id sequence past them so later inserts do not collide.
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Product"', 'id'), (SELECT MAX("id") FROM "Product"))`);
  console.log(`Seeded ${products.length} ShopSmart products.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
