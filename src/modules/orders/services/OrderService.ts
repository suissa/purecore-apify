import { prisma } from "../../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../../errors";

export class OrderService {
  async create(
    userId: string,
    items: { productId: string; quantity: number }[]
  ) {
    if (!items || items.length === 0)
      throw new BadRequestError("No items provided");

    // Fetch products to calculate total and check validity
    let total = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product)
        throw new NotFoundError(`Product ${item.productId} not found`);

      if (product.stock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for product ${product.name}`
        );
      }

      total += product.price * item.quantity;
      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Transaction: Create Order & Items, Update Stock
    return prisma.$transaction(async (tx) => {
      // Create Order
      const order = await tx.order.create({
        data: {
          userId,
          total,
          status: "PENDING",
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      // Update Stock
      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return order;
    });
  }

  async listByUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
