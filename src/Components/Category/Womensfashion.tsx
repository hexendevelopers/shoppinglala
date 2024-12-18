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
  category?: string;
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

interface ShopifyResponse {
  data?: {
    products: {
      edges: ProductEdge[];
    };
  };
  errors?: any[];
}

// Add new interface for sorting
interface SortOption {
  label: string;
  value: string;
}

// Update the GraphQL query to use variable properly
const GET_PRODUCTS_QUERY = `
  query GetProducts($category: String!, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: 250, query: $category, sortKey: $sortKey, reverse: $reverse) {
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
    // Add your buy now logic here
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
    <div className="bg-white text-black rounded-lg shadow-lg p-4 flex flex-col gap-4 w-72 relative">
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
            <div className="w-full h-48 bg-gray-200 flex  text-black items-center justify-center">
              <span>No image available</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-black">{product.node.title}</h2>
            <div className="flex items-center gap-2">
              <div className="flex text-black">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index} className={index < averageRating ? "text-yellow-500" : "text-gray-300"}>
                    &#9733;
                  </span>
                ))}
              </div>
              <span className="text-black">
                ({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span
                className={`text-black ${
                  discountPrice && discountPrice < originalPrice ? "line-through" : ""
                }`}
              >
                {currency} {originalPrice.toFixed(2)}
              </span>
              {discountPrice && discountPrice < originalPrice && (
                <span className="text-blackfont-semibold">
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

// Update Products component
export const Products: React.FC<ProductsProps> = ({ onDataFetch, category = "" }) => {
  const [products, setProducts] = useState<ProductEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("TITLE"); // Default sort

  const sortOptions = [
    { label: "Name A-Z", value: "TITLE" },
    { label: "Name Z-A", value: "TITLE,reverse" },
    { label: "Price Low to High", value: "PRICE" },
    { label: "Price High to Low", value: "PRICE,reverse" }
  ];

  useEffect(() => {
    async function fetchProducts() {
      try {
        // Log the query to debug
        console.log('Searching for category:', category);
        
        const variables = {
          // Try without 'product_type:' prefix to see if that helps
          category: category,
          sortKey: sortOption.split(",")[0],
          reverse: sortOption.includes("reverse")
        };

        console.log('Query variables:', variables);
        const data = await shopifyFetch(GET_PRODUCTS_QUERY, variables) as ShopifyResponse;
        
        // Log the response to see what we're getting back
        console.log('Shopify response:', data);

        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          setError("Failed to load products. Please try again later.");
        } else if (data.data) {
          setProducts(data.data.products.edges);
          console.log('Found products:', data.data.products.edges.length);
          if (onDataFetch) {
            onDataFetch(data.data.products.edges);
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Error fetching products. Please check your connection and try again.");
      }
    }
    fetchProducts();
  }, [category, sortOption, onDataFetch]);

  return (
    <div>
      <div className="mb-4">
        <select
          className="p-2 border rounded-md text-black"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full flex flex-wrap gap-6 justify-center mt-6">
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.node.id} product={product} />
          ))
        ) : (
          <div>No products available.</div>
        )}
      </div>
    </div>
  );
};

// Update Womensfashion component to be more generic
const CategoryPage: React.FC<{ category: string }> = ({ category }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{category}</h1>
      <Products category={category} />
    </div>
  );
};

export default CategoryPage;