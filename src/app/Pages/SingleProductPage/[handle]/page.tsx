"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import shopifyFetch from "../../../../../lib/shopify";
import { FaHeart, FaRegHeart, FaTruck, FaShieldAlt } from "react-icons/fa";
import { db } from "../../../../../lib/firebase";
import { ref, set, get, remove } from "firebase/database";
import ProductReview from '../../../../Components/ProductReview';
import dynamic from 'next/dynamic';
import Header from "../../../../Components/Header";

// GraphQL query
const GET_PRODUCT_BY_HANDLE = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      handle
      images(first: 5) {
        edges {
          node {
            src
          }
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            availableForSale
            selectedOptions {
              name
              value
            }
            price {
              amount
              currencyCode
            }
          }
        }
      }
      options {
        name
        values
      }
    }
  }
`;

// Helper function for calculating discount
const calculateDiscountPrice = (originalPrice: number, discountPercent: number = 20): number | null => {
  if (!originalPrice || isNaN(originalPrice)) return null;
  return (originalPrice * (100 - discountPercent)) / 100;
};

// Add helper function at the top with other helpers
const extractCustomerId = (customerId: string): string => {
  if (customerId.includes('gid://shopify/Customer/')) {
    return customerId.replace('gid://shopify/Customer/', '');
  }
  return customerId;
};

const SingleProductPage = ({ params }: { params: { handle: string } }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
 
  const unwrappedParams = use(params);
  const handle = unwrappedParams?.handle;
  
  const [product, setProduct] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [discountPercent] = useState(20); // Fixed 20% discount
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string}>({});
  const [originalPrice, setOriginalPrice] = useState<number>(0);

  // Authentication check
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

  const handleOptionChange = (optionName: string, value: string) => {
    const newSelectedOptions = { ...selectedOptions, [optionName]: value };
    setSelectedOptions(newSelectedOptions);
  
    // Find the matching variant
    const matchingVariant = product.product.variants.edges.find((variant: any) => {
      return variant.node.selectedOptions.every((option: any) => 
        newSelectedOptions[option.name] === option.value
      );
    });
  
    if (matchingVariant) {
      setSelectedVariant(matchingVariant.node);
      setOriginalPrice(parseFloat(matchingVariant.node.price.amount));
    }
  };

  useEffect(() => {
    if (product && product.product.variants.edges.length > 0) {
      const defaultVariant = product.product.variants.edges[0].node;
      setSelectedVariant(defaultVariant);
      setOriginalPrice(parseFloat(defaultVariant.price.amount));
      
      // Set initial selected options
      const initialOptions: {[key: string]: string} = {};
      defaultVariant.selectedOptions.forEach((option: any) => {
        initialOptions[option.name] = option.value;
      });
      setSelectedOptions(initialOptions);
    }
  }, [product]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!handle) return;

      try {
        const response = await shopifyFetch(GET_PRODUCT_BY_HANDLE, {
          handle: handle,
        });
        setProduct(response.data);
        if (response.data.product.images.edges[0]) {
          setSelectedImage(response.data.product.images.edges[0].node.src);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      }
    };

    if (handle) {
      fetchProduct();
    }
  }, [handle]);

  // Check wishlist status
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated() || !product) return;

      try {
        const userTokenString = localStorage.getItem('usertoken');
        const userToken = JSON.parse(userTokenString!);
        const customerId = extractCustomerId(userToken.userId);
        const productId = product.product.id.split('/').pop();
        
        const wishlistRef = ref(db, `${customerId}/wishlist/${productId}`);
        const snapshot = await get(wishlistRef);
        setIsInWishlist(snapshot.exists());
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [product]);

  const handleAddToCart = async () => {
    if (!isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      router.push('/loginpage');
      return;
    }

    try {
      const userTokenString = localStorage.getItem('usertoken');
      const userToken = JSON.parse(userTokenString!);
      const customerId = extractCustomerId(userToken.userId);
      const productId = product.product.id.split('/').pop();
      
      const cartRef = ref(db, `${customerId}/cart/${productId}`);
      const cartSnapshot = await get(cartRef);
      
      if (cartSnapshot.exists()) {
        const existingItem = cartSnapshot.val();
        await set(cartRef, {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
          selectedOptions: selectedVariant?.selectedOptions || [],
          variantId: selectedVariant?.id || ''
        });
      } else {
        const cartItem = {
          title: product.product.title,
          image: product.product.images.edges[0]?.node?.src || '',
          price: selectedVariant?.price.amount || '',
          quantity: quantity,
          handle: product.product.handle,
          variantId: selectedVariant?.id || '',
          selectedOptions: selectedVariant?.selectedOptions || []
        };
        await set(cartRef, cartItem);
      }

      console.log('Product added to cart successfully');
      alert('Product added to cart successfully');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated()) {
      router.push('/loginpage');
      return;
    }

    try {
      const userTokenString = localStorage.getItem('usertoken');
      if (!userTokenString) {
        console.error('No user token found');
        return;
      }

      const userToken = JSON.parse(userTokenString);
      const customerId = extractCustomerId(userToken.userId);
      const productId = product.product.id.split('/').pop();
      
      const wishlistRef = ref(db, `${customerId}/wishlist/${productId}`);
      const wishlistSnapshot = await get(wishlistRef);

      if (wishlistSnapshot.exists()) {
        await remove(wishlistRef);
        setIsInWishlist(false);
      } else {
        const wishlistItem = {
          title: product.product.title,
          image: product.product.images.edges[0]?.node?.src || '',
          price: selectedVariant?.price.amount || '',
          handle: product.product.handle
        };
        await set(wishlistRef, wishlistItem);
        setIsInWishlist(true);
      }

      console.log(`Product ${isInWishlist ? 'removed from' : 'added to'} wishlist`);
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const { title, description, images } = product.product;
  const discountPrice = calculateDiscountPrice(originalPrice, discountPercent);

  return (
    <div className="container mx-auto px-4 py-8 text-black">
      <Header />

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square w-full relative">
              <img
                src={selectedImage}
                alt={title}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={handleWishlistToggle}
                className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
              >
                {isInWishlist ? (
                  <FaHeart className="text-red-500 text-xl" />
                ) : (
                  <FaRegHeart className="text-gray-400 text-xl" />
                )}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.edges.map((image: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(image.node.src)}
                  className="w-24 h-24 flex-shrink-0"
                >
                  <img
                    src={image.node.src}
                    alt={`${title} ${index + 1}`}
                    className={`w-full h-full object-cover rounded-md transition-all duration-200 ${
                      selectedImage === image.node.src
                        ? "border-2 border-blue-500"
                        : "border border-gray-200"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">{title}</h1>
            
            {/* Variant Selection */}
            {product.product.options.map((option: any) => (
              <div key={option.name} className="space-y-2">
                <label className="block text-sm font-medium">
                  {option.name}
                </label>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value: string) => (
                    <button
                      key={value}
                      onClick={() => handleOptionChange(option.name, value)}
                      className={`px-4 py-2 border rounded-md ${
                        selectedOptions[option.name] === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Price Section */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className={`text-xl ${discountPrice ? 'line-through opacity-75' : 'font-bold'}`}>
                  {selectedVariant?.price.currencyCode || 'USD'} {selectedVariant ? parseFloat(selectedVariant.price.amount).toFixed(2) : '0.00'}
                </span>
                {discountPrice && (
                  <span className="text-2xl font-bold">
                    {selectedVariant?.price.currencyCode || 'USD'} {discountPrice.toFixed(2)}
                    <span className="ml-2 text-sm">
                      ({discountPercent}% OFF)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold">Description</h3>
              <p>{description}</p>
            </div>

            {/* Delivery Info */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <FaTruck />
                <span>Free Delivery on orders over $100</span>
              </div>
              <div className="flex items-center gap-2">
                <FaShieldAlt />
                <span>2 Year Warranty</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium">Quantity:</label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 border-r border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-4 py-1">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1 border-l border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Price */}
              <div className="text-lg font-semibold">
                Total: {selectedVariant?.price.currencyCode || 'USD'} {
                  ((discountPrice || parseFloat(selectedVariant?.price.amount || '0')) * quantity).toFixed(2)
                }
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-200 font-medium"
                >
                  Add to Cart
                </button>
                
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add ProductReview component */}
      {product && (
        <ProductReview 
          productId={product.product.id.split('/').pop()} 
        />
      )}
    </div>
  );
};

export default SingleProductPage;