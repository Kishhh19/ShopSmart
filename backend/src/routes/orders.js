import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { orderSchema } from '../validators/schemas.js';
import { requireUser } from '../lib/auth.js';
const router = Router();

router.post('/', requireUser, async (request, response, next) => {
  try {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_ORDER', message: 'Check the customer and cart information.', details: parsed.error.flatten() } });

    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true } });
    if (products.length !== productIds.length) return response.status(422).json({ error: { code: 'PRODUCT_UNAVAILABLE', message: 'One or more products are unavailable.' } });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = parsed.data.items.map((item) => ({ ...item, product: productMap.get(item.productId) }));
    const unavailable = normalizedItems.find((item) => item.quantity > item.product.stock);
    if (unavailable) return response.status(409).json({ error: { code: 'INSUFFICIENT_STOCK', message: `Only ${unavailable.product.stock} unit(s) of ${unavailable.product.name} are available.` } });

    const total = normalizedItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const order = await prisma.$transaction(async (transaction) => {
      for (const item of normalizedItems) {
        const updated = await transaction.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (updated.count !== 1) throw Object.assign(new Error('Stock changed while placing the order.'), { status: 409, code: 'STOCK_CHANGED' });
      }
      return transaction.order.create({
        data: {
          customerName: parsed.data.customerName, email: parsed.data.email, address: parsed.data.address, total,
          userId: request.user.id,
          items: { create: normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.product.price })) }
        },
        include: { items: true }
      });
    });
    response.status(201).json(serializeOrder(order));
  } catch (error) { next(error); }
});

// Signed-in customers can list only their own orders.
router.get('/', requireUser, async (request, response, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: request.user.id }, orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: { select: { name: true } } } } }
    });
    response.json({ orders: orders.map(serializeOrder) });
  } catch (error) { next(error); }
});

// Ownership is enforced here on the server, not by hiding links in React.
router.get('/:id', requireUser, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'Order ID must be a positive integer.' } });
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { name: true } } } } } });
    if (!order) return response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order could not be found.' } });
    if (order.userId !== request.user.id) return response.status(403).json({ error: { code: 'ORDER_FORBIDDEN', message: 'You can only view your own orders.' } });
    response.json(serializeOrder(order));
  } catch (error) { next(error); }
});

function serializeOrder(order) {
  return {
    id: order.id, status: order.status, customerName: order.customerName, email: order.email, address: order.address,
    total: Number(order.total), createdAt: order.createdAt, userId: order.userId,
    items: order.items.map((item) => ({ id: item.id, productId: item.productId, productName: item.product?.name, quantity: item.quantity, unitPrice: Number(item.unitPrice) }))
  };
}
export default router;
