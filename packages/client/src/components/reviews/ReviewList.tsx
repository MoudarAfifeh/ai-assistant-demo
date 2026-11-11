import { HiSparkles } from 'react-icons/hi2';
import { useMutation, useQuery } from '@tanstack/react-query';

import StarRating from './StarRating';
import { Button } from '../ui/button';
import ReviewSkeleton from './ReviewSkeleton';
import {
   reviewsApi,
   type GetReviewResponse,
   type SummarizeResponse,
} from './reviewsApi';

type Props = {
   productId: number;
};

function ReviewList({ productId }: Props) {
   const summryMutation = useMutation<SummarizeResponse>({
      mutationFn: () => reviewsApi.summarizeReviews(productId),
   });

   const reviewsQuery = useQuery<GetReviewResponse>({
      queryKey: ['reviews', productId],
      queryFn: () => reviewsApi.fetchReviews(productId),
   });

   if (reviewsQuery.isLoading)
      return (
         <div className=" flex flex-col gap-5">
            {[1, 2, 3].map((i) => (
               <ReviewSkeleton key={i} />
            ))}
         </div>
      );
   if (reviewsQuery.isError) {
      return (
         <p className=" text-red-500">Could not fetch reviews, Try again!</p>
      );
   }
   if (!reviewsQuery.data?.reviews.length) {
      return (
         <p className="text-muted-foreground">
            This product has no reviews yet, so there is nothing to summarize.
         </p>
      );
   }
   const currentSummary =
      reviewsQuery.data?.summary || summryMutation.data?.summary;
   return (
      <div>
         <div className="mb-6">
            {currentSummary ? (
               <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700">
                     <HiSparkles />
                     AI summary
                  </div>
                  <p className="text-gray-800">{currentSummary}</p>
               </div>
            ) : (
               <div>
                  <Button
                     onClick={() => summryMutation.mutate()}
                     className="cursor-pointer"
                     disabled={summryMutation.isPending}
                  >
                     <HiSparkles />
                     Summarize
                  </Button>
                  {summryMutation.isPending && (
                     <div className="py-3">
                        <ReviewSkeleton />
                     </div>
                  )}
                  {summryMutation.isError && (
                     <p className=" text-red-500">
                        Could not summarize reviews. Try again!
                     </p>
                  )}
               </div>
            )}
         </div>
         <div className="flex flex-col gap-5">
            {reviewsQuery.data?.reviews.map((review) => (
               <div key={review.id} className="border-b pb-4 last:border-0">
                  <div className=" font-semibold">{review.author}</div>
                  <div>
                     <StarRating value={review.rating} />
                  </div>
                  <p className="py-2">{review.content}</p>
               </div>
            ))}
         </div>
      </div>
   );
}

export default ReviewList;
