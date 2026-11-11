import { prisma } from '../prisma';
import seedData from './seed-data.json';

// Idempotent: upserts products by id and only inserts reviews for products
// that don't have any yet, so running it twice doesn't duplicate data.
async function main() {
   for (const { reviews, ...product } of seedData) {
      await prisma.product.upsert({
         where: { id: product.id },
         update: product,
         create: product,
      });

      const existing = await prisma.review.count({
         where: { productId: product.id },
      });
      if (existing === 0 && reviews.length) {
         await prisma.review.createMany({
            data: reviews.map((r) => ({ ...r, productId: product.id })),
         });
      }
      console.log(`Seeded ${product.name} (${reviews.length} reviews)`);
   }
}

main()
   .then(() => prisma.$disconnect())
   .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
   });
