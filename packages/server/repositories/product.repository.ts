import { prisma } from '../prisma';

export const productRepository = {
   getProduct(productId: number) {
      return prisma.product.findUnique({
         where: { id: productId },
      });
   },
   getProducts() {
      return prisma.product.findMany({
         select: {
            id: true,
            name: true,
            description: true,
            price: true,
            _count: { select: { reviews: true } },
         },
         orderBy: { id: 'asc' },
      });
   },
};
