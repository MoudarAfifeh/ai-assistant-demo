import ReviewList from './components/reviews/reviewList';

function App() {
   return (
      <div className=" p-4 h-screen">
         <ReviewList productId={2} />
      </div>
   );
}

export default App;
