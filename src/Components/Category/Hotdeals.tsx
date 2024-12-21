"use client";

import React, { useEffect, useState } from "react";
import shopifyFetch from "../../../lib/shopify";
import { useRouter } from "next/navigation";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { db } from "../../../lib/firebase";
import { ref, set, get, remove } from "firebase/database";
import Link from "next/link";

// Types
interface ProductNode {
  id: string;
  title: string;
  description: string;
  handle: string;
  images: {
    edges: Array<{
      node: {
        src: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        price: {
          amount: string;
          currencyCode: string;
        };
      };
    }>;
  };
}

interface ProductEdge {
  node: ProductNode;
}

interface ProductCardProps {
  product: ProductEdge;
}

interface ProductsProps {
  onDataFetch?: (products: ProductEdge[]) => void;
}

interface WishlistItem {
  title: string;
  image: string;
  price: string;
  handle: string;
}

interface CartItem {
  title: string;
  image: string;
  price: string;
  quantity: number;
  handle: string;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
}

// GraphQL Queries
const GET_COLLECTIONS_QUERY = `
  {
    collections(first: 10) {
      edges {
        node {
          id
          title
          handle
          products(first: 10) {
            edges {
              node {
                id
                title
                description
                handle
                images(first: 1) {
                  edges {
                    node {
                      src
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Helper functions
const calculateDiscountPrice = (originalPrice: number, discountPercent: number = 20): number | null => {
  if (!originalPrice || isNaN(originalPrice)) return null;
  return (originalPrice * (100 - discountPercent)) / 100;
};

const extractIdFromGid = (gid: string): string => {
  return gid.split('/').pop() || '';
};

const extractCustomerId = (customerId: string): string => {
  if (customerId.includes('gid://shopify/Customer/')) {
    return customerId.replace('gid://shopify/Customer/', '');
  }
  return customerId;
};

// Authentication check function
const isAuthenticated = () => {
  if (typeof window !== 'undefined') {
    try {
      const customerData = localStorage.getItem('customerData');
      const userToken = localStorage.getItem('usertoken');
      const accessToken = localStorage.getItem('useraccessToken');
      
      if (!customerData || !userToken || !accessToken) {
        console.log('Missing authentication data');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
  return false;
};

// Product Card Component
const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  
  // Product details extraction
  const imageSrc = product.node.images.edges[0]?.node?.src || null;
  const originalPrice = parseFloat(
    product.node.variants.edges[0]?.node?.price?.amount || "0"
  );
  const currency = product.node.variants.edges[0]?.node?.price?.currencyCode || "USD";
  const discountPercent = 20;
  const discountPrice = calculateDiscountPrice(originalPrice, discountPercent);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        const productId = extractIdFromGid(product.node.id);
        const reviewsRef = ref(db, `reviews/${productId}`);
        const snapshot = await get(reviewsRef);
        
        if (snapshot.exists()) {
          const reviews = Object.values(snapshot.val());
          setReviewCount(reviews.length);
          
          // Calculate average rating
          const totalRating = reviews.reduce((acc: number, review: any) => acc + review.rating, 0);
          setAverageRating(totalRating / reviews.length);
        } else {
          setReviewCount(0);
          setAverageRating(0);
        }
      } catch (error) {
        console.error('Error fetching review data:', error);
        setReviewCount(0);
        setAverageRating(0);
      }
    };

    fetchReviewData();
  }, [product.node.id]);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      router.push('/loginpage');
      return;
    }

    try {
      const userTokenString = localStorage.getItem('usertoken');
      const userToken = JSON.parse(userTokenString!);
      const customerId = extractCustomerId(userToken.userId);
      const productId = extractIdFromGid(product.node.id);
      
      const wishlistRef = ref(db, `${customerId}/wishlist/${productId}`);
      const wishlistSnapshot = await get(wishlistRef);

      if (wishlistSnapshot.exists()) {
        await remove(wishlistRef);
        setIsInWishlist(false);
      } else {
        const wishlistItem: WishlistItem = {
          title: product.node.title,
          image: product.node.images.edges[0]?.node?.src || '',
          price: product.node.variants.edges[0]?.node?.price?.amount || '',
          handle: product.node.handle
        };
        await set(wishlistRef, wishlistItem);
        setIsInWishlist(true);
      }

      console.log(`Product ${isInWishlist ? 'removed from' : 'added to'} wishlist`);
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      router.push('/loginpage');
      return;
    }

    try {
      const userTokenString = localStorage.getItem('usertoken');
      const userToken = JSON.parse(userTokenString!);
      const customerId = extractCustomerId(userToken.userId);
      const productId = extractIdFromGid(product.node.id);
      
      const cartRef = ref(db, `${customerId}/cart/${productId}`);
      const cartSnapshot = await get(cartRef);
      
      if (cartSnapshot.exists()) {
        const existingItem = cartSnapshot.val();
        await set(cartRef, {
          ...existingItem,
          quantity: existingItem.quantity + 1
        });
      } else {
        const cartItem: CartItem = {
          title: product.node.title,
          image: product.node.images.edges[0]?.node?.src || '',
          price: product.node.variants.edges[0]?.node?.price?.amount || '',
          quantity: 1,
          handle: product.node.handle
        };
        await set(cartRef, cartItem);
      }

      console.log('Product added to cart successfully');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (isAuthenticated()) {
        try {
          const userTokenString = localStorage.getItem('usertoken');
          const userToken = JSON.parse(userTokenString!);
          const customerId = extractCustomerId(userToken.userId);
          const productId = extractIdFromGid(product.node.id);
          const wishlistRef = ref(db, `${customerId}/wishlist/${productId}`);
          const snapshot = await get(wishlistRef);
          setIsInWishlist(snapshot.exists());
        } catch (error) {
          console.error('Error checking wishlist status:', error);
        }
      }
    };

    checkWishlistStatus();
  }, [product.node.id]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col gap-4 w-72 relative">
      <button 
        onClick={handleWishlistClick}
        className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
      >
        {isInWishlist ? (
          <FaHeart className="text-red-500 text-xl" />
        ) : (
          <FaRegHeart className="text-gray-400 text-xl hover:text-red-500" />
        )}
      </button>

      <Link href={`/Pages/SingleProductPage/${product.node.handle}`}>
        <div className="cursor-pointer">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.node.title}
              className="w-full h-48 object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <span>No image available</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-gray-800">{product.node.title}</h2>
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index} className={index < averageRating ? "text-yellow-500" : "text-gray-300"}>
                    &#9733;
                  </span>
                ))}
              </div>
              <span className="text-gray-500">
                ({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span
                className={`text-gray-500 ${
                  discountPrice && discountPrice < originalPrice ? "line-through" : ""
                }`}
              >
                {currency} {originalPrice.toFixed(2)}
              </span>
              {discountPrice && discountPrice < originalPrice && (
                <span className="text-green-500 font-semibold">
                  {currency} {discountPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="flex gap-2 mt-auto">
        <button
          className="bg-green-500 text-white text-sm px-4 py-2 rounded-md hover:bg-green-600 w-full"
          onClick={handleAddToCart}
        >
          Add to Cart
        </button>
      </div>
      <button
        className="bg-red-500 text-white text-sm px-4 py-2 rounded-md hover:bg-red-600 w-full mt-2"
        onClick={handleBuyNow}
      >
        Buy Now
      </button>
    </div>
  );
};

// Products Component
const Products: React.FC<ProductsProps> = ({ onDataFetch }) => {
  const router = useRouter();
  const [collections, setCollections] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const data = await shopifyFetch(GET_COLLECTIONS_QUERY);
        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          setError("Failed to load collections. Please try again later.");
        } else {
          console.log("API Response:", data); // Debug log
          const hotDealsCollection = data.data.collections.edges.find(
            (collection: any) => collection.node.title === "Hot Deals"
          );
          console.log("Hot Deals Collection:", hotDealsCollection); // Debug log
          if (!hotDealsCollection) {
            setError("Hot Deals collection not found");
            return;
          }
          setCollections([hotDealsCollection]);
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        setError("Error fetching collections. Please check your connection and try again.");
      }
    }
    fetchCollections();
  }, []);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (collections.length === 0) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="w-full">
      {collections.map((collection) => (
        <div key={collection.node.id} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{collection.node.title}</h2>
          <div className="flex flex-wrap gap-6 justify-center">
            {collection.node.products.edges.map((product: ProductEdge) => (
              <ProductCard key={product.node.id} product={product} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Products;