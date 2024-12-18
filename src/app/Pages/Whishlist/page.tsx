"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../../lib/firebase";
import { ref, get, remove } from "firebase/database";
import Link from "next/link";
import Header from "../../../Components/Header";

// Types
interface WishlistItem {
  title: string;
  image: string;
  price: string;
  handle: string;
}

const WishlistPage = () => {
  const router = useRouter();
  const [wishlistItems, setWishlistItems] = useState<{ [key: string]: WishlistItem }>({});
  const [loading, setLoading] = useState(true);

  // Helper function to extract customer ID from token
  const extractCustomerId = (customerId: string): string => {
    if (customerId.includes('gid://shopify/Customer/')) {
      return customerId.replace('gid://shopify/Customer/', '');
    }
    return customerId;
  };

  // Check authentication
  const isAuthenticated = () => {
    if (typeof window !== 'undefined') {
      const customerData = localStorage.getItem('customerData');
      const userToken = localStorage.getItem('usertoken');
      const accessToken = localStorage.getItem('useraccessToken');
      return !!(customerData && userToken && accessToken);
    }
    return false;
  };

  // Fetch wishlist items
  useEffect(() => {
    const fetchWishlistItems = async () => {
      if (!isAuthenticated()) {
        router.push('/loginpage');
        return;
      }

      try {
        const userTokenString = localStorage.getItem('usertoken');
        const userToken = JSON.parse(userTokenString!);
        const customerId = extractCustomerId(userToken.userId);
        
        const wishlistRef = ref(db, `${customerId}/wishlist`);
        const snapshot = await get(wishlistRef);
        
        if (snapshot.exists()) {
          setWishlistItems(snapshot.val());
        }
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistItems();
  }, [router]);

  // Remove item from wishlist
  const handleRemoveItem = async (productId: string) => {
    try {
      const userTokenString = localStorage.getItem('usertoken');
      const userToken = JSON.parse(userTokenString!);
      const customerId = extractCustomerId(userToken.userId);
      
      const wishlistRef = ref(db, `${customerId}/wishlist/${productId}`);
      await remove(wishlistRef);
      
      // Update local state
      const updatedItems = { ...wishlistItems };
      delete updatedItems[productId];
      setWishlistItems(updatedItems);
    } catch (error) {
      console.error('Error removing item from wishlist:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
                     <Header />

      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>
      
      {Object.keys(wishlistItems).length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Your wishlist is empty</p>
          <Link href="/Pages/Products" className="text-blue-500 hover:underline">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(wishlistItems).map(([productId, item]) => (
            <div key={productId} className="bg-white rounded-lg shadow-lg p-4">
              <Link href={`/Pages/SingleProductPage/${item.handle}`}>
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              </Link>
              <h2 className="text-lg font-bold mb-2">{item.title}</h2>
              <p className="text-gray-600 mb-4">${parseFloat(item.price).toFixed(2)}</p>
              <div className="flex justify-between">
                <Link 
                  href={`/Pages/SingleProductPage/${item.handle}`}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  View Product
                </Link>
                <button
                  onClick={() => handleRemoveItem(productId)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;