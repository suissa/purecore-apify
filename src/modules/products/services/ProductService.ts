import { prisma } from "../../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../../errors";

export class ProductService {
  async list() {
    return prisma.product.findMany();
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  async create(data: any) {
    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        image: data.image,
      },
    });
  }

  async update(id: string, data: any) {
    // Check existence
    await this.getById(id);
    return prisma.product.update({
      where: { id },
      data: {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        stock: data.stock ? parseInt(data.stock) : undefined,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return prisma.product.delete({ where: { id } });
  }
}
