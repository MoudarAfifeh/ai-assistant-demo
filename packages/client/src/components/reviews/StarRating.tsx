import { FaRegStar, FaStar } from 'react-icons/fa';

type Props = {
   value: number;
};
function StarRating({ value }: Props) {
   const placeHolder = [1, 2, 3, 4, 5];
   return (
      <div className=" flex gap-1 text-yellow-500">
         {placeHolder.map((p) =>
            p <= value ? <FaStar key={p} /> : <FaRegStar key={p} />
         )}
      </div>
   );
}

export default StarRating;
