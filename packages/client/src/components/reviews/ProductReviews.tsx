import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import ReviewList from './ReviewList';
import { reviewsApi, type Product } from './reviewsApi';

function ProductReviews() {
   const productsQuery = useQuery<Product[]>({
      queryKey: ['products'],
      queryFn: reviewsApi.fetchProducts,
   });
   const [selectedId, setSelectedId] = useState<number | null>(null);

   if (productsQuery.isLoading) {
      return <p className="text-muted-foreground">Loading products…</p>;
   }
   if (productsQuery.isError || !productsQuery.data?.length) {
      return <p className="text-red-500">Could not load products.</p>;
   }

   const products = productsQuery.data;
   const product = products.find((p) => p.id === selectedId) ?? products[0]!;

   return (
      <div className="flex flex-col gap-6 md:flex-row">
         <aside className="flex shrink-0 flex-col gap-2 md:w-64">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
               Products
            </p>
            {products.map((p) => (
               <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`cursor-pointer rounded-lg border p-3 text-left text-sm transition ${
                     p.id === product.id
                        ? 'border-violet-400 bg-violet-50'
                        : 'hover:bg-gray-50'
                  }`}
               >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground">
                     ${p.price.toFixed(2)} · {p.reviewCount} reviews
                  </div>
               </button>
            ))}
         </aside>

         <section className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            {product.description && (
               <p className="mb-4 mt-1 text-muted-foreground">
                  {product.description}
               </p>
            )}
            {/* key resets the summary state when switching products */}
            <ReviewList key={product.id} productId={product.id} />
         </section>
      </div>
   );
}

export default ProductReviews;
