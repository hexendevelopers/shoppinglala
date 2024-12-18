"use client";

import React, { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { db } from "../../lib/firebase";
import { ref, set, get, push } from "firebase/database";

interface Review {
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

interface ProductReviewProps {
  productId: string;
}

const ProductReview: React.FC<ProductReviewProps> = ({ productId }) => {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasReviewed, setHasReviewed] = useState<boolean>(false);
  const [averageRating, setAverageRating] = useState<number>(0);

  // Authentication check
  const isAuthenticated = () => {
    if (typeof window !== 'undefined') {
      const customerData = localStorage.getItem('customerData');
      return !!customerData;
    }
    return false;
  };

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      const reviewsRef = ref(db, `reviews/${productId}`);
      const snapshot = await get(reviewsRef);
      
      if (snapshot.exists()) {
        const reviewsData = Object.values(snapshot.val()) as Review[];
        setReviews(reviewsData);
        
        // Calculate average rating
        const total = reviewsData.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(total / reviewsData.length);

        // Check if current user has already reviewed
        if (isAuthenticated()) {
          const customerData = JSON.parse(localStorage.getItem('customerData')!);
          const userReview = reviewsData.find(review => review.userId === customerData.email);
          setHasReviewed(!!userReview);
        }
      }
    };

    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated()) {
      alert('Please login to submit a review');
      return;
    }

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      const customerData = JSON.parse(localStorage.getItem('customerData')!);
      const reviewsRef = ref(db, `reviews/${productId}`);
      
      const newReview: Review = {
        userId: customerData.email,
        userName: `${customerData.firstName} ${customerData.lastName}`,
        rating,
        comment,
        date: new Date().toISOString()
      };

      await push(reviewsRef, newReview);

      // Update local state
      setReviews([...reviews, newReview]);
      setHasReviewed(true);
      setComment('');
      setRating(0);

      // Recalculate average
      const newTotal = reviews.reduce((acc, review) => acc + review.rating, 0) + rating;
      setAverageRating(newTotal / (reviews.length + 1));

      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8 text-black">
      <h2 className="text-2xl font-bold mb-6">Product Reviews</h2>
      
      {/* Average Rating Display */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar
                key={star}
                className={star <= averageRating ? 'text-yellow-500' : 'text-black'}
              />
            ))}
          </div>
          <span className="text-lg font-semibold">
            {averageRating.toFixed(1)} out of 5
          </span>
          <span>
            ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      </div>

      {/* Review Form */}
      {isAuthenticated() && !hasReviewed && (
        <form onSubmit={handleSubmitReview} className="mb-8">
          <div className="mb-4">
            <label className="block font-medium mb-2">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="text-2xl focus:outline-none"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                >
                  <FaStar
                    className={`transition-colors ${
                      star <= (hover || rating) ? 'text-yellow-500' : 'text-black'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Write your review here..."
              required
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit Review
          </button>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review, index) => (
          <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    className={star <= review.rating ? 'text-yellow-500' : 'text-black'}
                  />
                ))}
              </div>
              <span className="font-medium">{review.userName}</span>
              <span className="text-sm">
                {new Date(review.date).toLocaleDateString()}
              </span>
            </div>
            <p>{review.comment}</p>
          </div>
        ))}
      </div>

      {reviews.length === 0 && (
        <p className="text-center py-4">No reviews yet. Be the first to review this product!</p>
      )}
    </div>
  );
};

export default ProductReview; 