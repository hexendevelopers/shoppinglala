"use client";

import { useEffect, useState } from 'react';
import Account from '../Components/Account';
import Link from 'next/link';
import { AiOutlineHeart, AiOutlineShoppingCart, AiOutlineSearch } from 'react-icons/ai';
import { db } from "../../lib/firebase";
import { ref, onValue } from "firebase/database";

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
}

export default function Header() {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const extractCustomerId = (customerId: string): string => {
    if (customerId.includes('gid://shopify/Customer/')) {
      return customerId.replace('gid://shopify/Customer/', '');
    }
    return customerId;
  };

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

  useEffect(() => {
    const setupListeners = () => {
      if (!isAuthenticated()) {
        console.log('User not authenticated, skipping listeners setup');
        return;
      }

      try {
        const userTokenString = localStorage.getItem('usertoken');
        if (!userTokenString) {
          console.log('No user token found');
          return;
        }

        const userToken = JSON.parse(userTokenString);
        const customerId = extractCustomerId(userToken.userId);
        
        // Wishlist listener
        const wishlistRef = ref(db, `${customerId}/wishlist`);
        const wishlistUnsubscribe = onValue(wishlistRef, (snapshot) => {
          if (snapshot.exists()) {
            const items = snapshot.val();
            setWishlistCount(Object.keys(items).length);
          } else {
            setWishlistCount(0);
          }
        });

        // Cart listener
        const cartRef = ref(db, `${customerId}/cart`);
        const cartUnsubscribe = onValue(cartRef, (snapshot) => {
          if (snapshot.exists()) {
            const items = snapshot.val();
            setCartCount(Object.keys(items).length);
          } else {
            setCartCount(0);
          }
        });

        // Cleanup subscriptions
        return () => {
          wishlistUnsubscribe();
          cartUnsubscribe();
        };
      } catch (error) {
        console.error('Error setting up listeners:', error);
      }
    };

    setupListeners();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.getElementById('search-container');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
     
    try {
      const response = await fetch('/api/shopify/searchProducts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchQuery: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setSearchResults(data.products || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    }
  };

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link 
          href="/" 
          className="text-2xl font-bold text-gray-800 hover:text-gray-600 transition-colors duration-300"
        >
          SHOPPING LALA
        </Link>

        <div className="flex-1 mx-8">
          <nav className="flex items-center space-x-6">
            <Link
              href="/Pages/Category/Womenfashion"
              className="text-gray-600 hover:text-gray-800 transition-colors duration-300"
            >
              Women fashion
            </Link>
          </nav>
        </div>

        <nav className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div id="search-container" className="relative">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="text-gray-600 hover:text-gray-800 p-2 relative group"
              >
                <AiOutlineSearch
                  size={24}
                  className="transition-colors duration-300 group-hover:text-blue-500"
                />
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  Search
                </span>
              </button>

              {isSearchOpen && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-lg p-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => setIsSearchOpen(false)}
                      className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>

                  {searchQuery && (
                    <div className="mt-4 max-h-96 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <ul className="space-y-2">
                          {searchResults.map((product) => (
                            <li key={product.id} className="hover:bg-gray-50 p-2 rounded">
                              <Link
                                href={`/Pages/SingleProductPage/${product.handle}`}
                                className="flex items-center space-x-4"
                                onClick={() => setIsSearchOpen(false)}
                              >
                                {product.image && (
                                  <img
                                    src={product.image}
                                    alt={product.imageAlt}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {product.title}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {product.currency} {parseFloat(product.price).toFixed(2)}
                                  </p>
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          No products found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link 
              href="/Pages/Whishlist" 
              className="text-gray-600 hover:text-gray-800 relative group"
            >
              <div className="relative p-2">
                <AiOutlineHeart 
                  size={24} 
                  className="transition-colors duration-300 group-hover:text-red-500"
                />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  Wishlist
                </span>
              </div>
            </Link>

            <Link 
              href="/Pages/CartPage" 
              className="text-gray-600 hover:text-gray-800 relative group"
            >
              <div className="relative p-2">
                <AiOutlineShoppingCart 
                  size={24} 
                  className="transition-colors duration-300 group-hover:text-blue-500"
                />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  Cart
                </span>
              </div>
            </Link>

            <Account />
          </div>
        </nav>
      </div>
    </header>
  );
}