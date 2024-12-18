"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const OrderConfirmation = () => {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    // Clear all relevant cart data from localStorage
    localStorage.removeItem('cartItems');
    localStorage.removeItem('cartCost');
    localStorage.removeItem('shopifyCartId');
    localStorage.removeItem('rzp_stored_checkout_id');
    
    // Get the order ID from localStorage if you stored it during payment
    const storedOrderId = localStorage.getItem('lastOrderId');
    if (storedOrderId) {
      setOrderId(storedOrderId);
      localStorage.removeItem('lastOrderId'); // Clean up
    }
  }, []);

  const handleContinueShopping = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Order Confirmed!
        </h2>
        
        {orderId && (
          <p className="text-gray-600 mb-4">
            Order ID: {orderId}
          </p>
        )}
        
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. We'll send you a confirmation email with your order details.
        </p>
        
        <button
          onClick={handleContinueShopping}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmation; 