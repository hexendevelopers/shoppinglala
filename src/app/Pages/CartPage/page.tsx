"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../../lib/firebase";
import { ref, get, set, remove } from "firebase/database";
import { FaTrash } from "react-icons/fa";
import shopifyFetch from "../../../../lib/shopify";
import Header from "../../../Components/Header";



 

// At the top of your file, add these constants
const REQUIRED_SCOPES = [
  'write_orders',
  'write_products',
  'read_customers'
];


interface CartItem {
  title: string;
  image: string;
  price: string;
  quantity: number;
  handle: string;
  variantId?: string;
}

interface ShopifyProduct {
  id: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
      }
    }>;
  };
}

interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

interface CartDiscountCode {
  code: string;
  applicable: boolean;
}

interface CartCost {
  subtotalAmount: MoneyV2;
  totalAmount: MoneyV2;
  totalTaxAmount?: MoneyV2;
  discountAmount?: MoneyV2;
}

interface CartResponse {
  cart: {
    id: string;
    cost: {
      subtotalAmount: MoneyV2;
      totalAmount: MoneyV2;
      totalTaxAmount?: MoneyV2;
    };
    discountCodes: CartDiscountCode[];
  };
}

const GET_PRODUCT_BY_HANDLE = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      variants(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

const CREATE_CART = `
  mutation createCart {
    cartCreate {
      cart {
        id
        createdAt
        updatedAt
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 10) {
          edges {
            node {
              id
              quantity
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const APPLY_DISCOUNT_CODE = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id
        discountCodes {
          code
          applicable
        }
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 10) {
          edges {
            node {
              id
              merchandise {
                ... on ProductVariant {
                  id
                  product {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const ADD_TO_CART = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 10) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const extractCustomerId = (userId: string): string => {
  if (userId.includes('gid://shopify/Customer/')) {
    return userId.replace('gid://shopify/Customer/', '');
  }
  return userId;
};

const CartPage = () => {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<Record<string, CartItem>>({});
    const [loading, setLoading] = useState(true);
    const [couponCode, setCouponCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<CartDiscountCode | null>(null);
    const [couponError, setCouponError] = useState('');
    const [cartId, setCartId] = useState<string | null>(null);
    const [cartCost, setCartCost] = useState<CartCost | null>(null);
    const [cartTotal, setCartTotal] = useState<number>(0);
  
    const formatCurrency = (amount: string | number) => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numAmount);
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

 




  
    const getVariantId = async (handle: string): Promise<string | null> => {
      try {
        const response = await shopifyFetch(GET_PRODUCT_BY_HANDLE, { handle });
        console.log('Product response for handle:', handle, response);
        
        const variantId = response?.data?.product?.variants?.edges?.[0]?.node?.id;
        console.log('Found variant ID:', variantId);
        
        return variantId || null;
      } catch (error) {
        console.error('Error fetching variant ID for handle:', handle, error);
        return null;
      }
    };
  
    
    

    const syncCartWithShopify = async () => {
        if (!cartId) return false;
      
        try {
          console.log('Starting cart sync with items:', cartItems);
          
          // First, clear existing cart lines
          const clearCartMutation = `
            mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
              cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;
    
          // Get and remove current cart lines
          const currentCart = await shopifyFetch(`
            query getCart($cartId: ID!) {
              cart(id: $cartId) {
                lines(first: 10) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
          `, { cartId });
    
          const lineIds = currentCart?.data?.cart?.lines?.edges?.map((edge: { node: { id: string } }) => edge.node.id) || [];
          if (lineIds.length > 0) {
            await shopifyFetch(clearCartMutation, { cartId, lineIds });
          }
          
          // Map items with their variant IDs
          const cartItemsWithVariants = await Promise.all(
            Object.entries(cartItems).map(async ([key, item]) => {
              const variantId = await getVariantId(item.handle);
              console.log(`Mapping item ${item.title} with handle ${item.handle} to variantId:`, variantId);
              console.log('Item quantity:', item.quantity);
              return {
                ...item,
                variantId,
              };
            })
          );
      
          // Create lines array with correct quantities
          const lines = cartItemsWithVariants
            .filter(item => item.variantId && item.quantity > 0)
            .map(item => ({
              quantity: parseInt(String(item.quantity)),
              merchandiseId: item.variantId
            }));
      
          if (lines.length === 0) {
            console.error('No valid items to sync');
            return false;
          }
      
          const variables = {
            cartId,
            lines
          };
      
          console.log('Syncing cart with variables:', JSON.stringify(variables, null, 4));
          const response = await shopifyFetch(ADD_TO_CART, variables);
          console.log('Cart sync response:', response);
      
          if (response?.data?.cartLinesAdd?.cart) {
            const { cost, lines } = response.data.cartLinesAdd.cart;
            setCartCost({
              subtotalAmount: cost.subtotalAmount,
              totalAmount: cost.totalAmount,
              totalTaxAmount: cost.totalTaxAmount
            });
            return true;
          }
      
          return false;
        } catch (error) {
          console.error('Error syncing cart:', error);
          return false;
        }
    };





  
    const updateQuantity = async (productId: string, newQuantity: number) => {
      if (newQuantity < 0) return;

      try {
        const userTokenString = localStorage.getItem('usertoken');
        if (!userTokenString) {
          router.push('/loginpage');
          return;
        }

        const userToken = JSON.parse(userTokenString);
        const customerId = extractCustomerId(userToken.userId);
        const cartRef = ref(db, `${customerId}/cart/${productId}`);

        if (newQuantity === 0) {
          await removeItem(productId);
          return;
        }

        let variantId = cartItems[productId].variantId;
        if (!variantId) {
          const newVariantId = await getVariantId(cartItems[productId].handle);
          if (newVariantId) {
            variantId = newVariantId;
          }
        }

        const updatedItem = {
          ...cartItems[productId],
          quantity: newQuantity,
          variantId: variantId
        };

        await set(cartRef, updatedItem);
        const updatedCartItems = {
          ...cartItems,
          [productId]: updatedItem
        };
        
        setCartItems(updatedCartItems);
        localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));

        await new Promise(resolve => setTimeout(resolve, 0));
        const syncResult = await syncCartWithShopify();
        
        if (!syncResult) {
          console.error('Failed to sync cart with Shopify');
          return;
        }

        if (appliedDiscount) {
          await handleApplyCoupon();
        }
      } catch (error) {
        console.error('Error updating quantity:', error);
      }
    };
  
    const removeItem = async (productId: string) => {
      try {
        const userTokenString = localStorage.getItem('usertoken');
        if (!userTokenString) {
          router.push('/loginpage');
          return;
        }

        const userToken = JSON.parse(userTokenString);
        const customerId = extractCustomerId(userToken.userId);
        const cartRef = ref(db, `${customerId}/cart/${productId}`);

        await remove(cartRef);
        const newCartItems = { ...cartItems };
        delete newCartItems[productId];
        setCartItems(newCartItems);
        // Update localStorage
        localStorage.setItem('cartItems', JSON.stringify(newCartItems));

        if (Object.keys(newCartItems).length === 0) {
          localStorage.removeItem('shopifyCartId');
          localStorage.removeItem('cartItems');
          setCartId(null);
          setAppliedDiscount(null);
          setCartCost(null);
        } else {
          await syncCartWithShopify();
          if (appliedDiscount) {
            await handleApplyCoupon();
          }
        }
      } catch (error) {
        console.error('Error removing item:', error);
      }
    };




    useEffect(() => {
        const fetchCartItems = async () => {
          if (!isAuthenticated()) {
            router.push('/loginpage');
            return;
          }
    
          try {
            // Get cart items from localStorage first
            const localCartItems = localStorage.getItem('cartItems');
            let initialCartItems = {};
            
            if (localCartItems) {
              initialCartItems = JSON.parse(localCartItems);
              setCartItems(initialCartItems);
            }

            let currentCartId = localStorage.getItem('shopifyCartId');
            
            if (!currentCartId) {
              const response = await shopifyFetch(CREATE_CART);
              if (response?.data?.cartCreate?.cart?.id) {
                const cartId = response.data.cartCreate.cart.id;
                localStorage.setItem('shopifyCartId', cartId);
                setCartId(cartId);
              }
            }
            
            setCartId(currentCartId);

            // Only fetch from Firebase if no local cart items exist
            if (!localCartItems) {
              const userTokenString = localStorage.getItem('usertoken');
              if (!userTokenString) return;

              const userToken = JSON.parse(userTokenString);
              const customerId = extractCustomerId(userToken.userId);
              const cartRef = ref(db, `${customerId}/cart`);
              const snapshot = await get(cartRef);

              if (snapshot.exists()) {
                const cartData = snapshot.val();
                setCartItems(cartData);
                // Save to localStorage
                localStorage.setItem('cartItems', JSON.stringify(cartData));
              }
            }

            await syncCartWithShopify();
          } catch (error) {
            console.error('Error fetching cart items:', error);
          } finally {
            setLoading(false);
          }
        };
    
        fetchCartItems();
    }, [router]);
    
      // Update the handleApplyCoupon function
const handleApplyCoupon = async () => {
    setCouponError('');
    setLoading(true);
        
        try {
          if (!couponCode) {
            setCouponError('Please enter a discount code');
            return;
          }
    
          if (!cartId) {
            const createCartResponse = await shopifyFetch(CREATE_CART);
            if (!createCartResponse?.data?.cartCreate?.cart?.id) {
              setCouponError('Failed to create cart');
              return;
            }
            const newCartId = createCartResponse.data.cartCreate.cart.id;
            localStorage.setItem('shopifyCartId', newCartId);
            setCartId(newCartId);
          }
    
          const syncSuccess = await syncCartWithShopify();
          if (!syncSuccess) {
            setCouponError('Failed to sync cart with Shopify');
            return;
          }
    
          const variables = {
            cartId: cartId,
            discountCodes: [couponCode]
          };
    
          const response = await shopifyFetch(APPLY_DISCOUNT_CODE, variables);
    console.log('Discount response:', response);

    if (response.errors) {
      setCouponError(response.errors[0]?.message || 'Failed to apply discount code');
      return;
    }

    const { cart, userErrors } = response.data.cartDiscountCodesUpdate;

    if (userErrors?.length > 0) {
      setCouponError(userErrors[0].message);
      return;
    }

    if (!cart?.discountCodes?.length) {
      setCouponError('Invalid discount code');
      return;
    }

    const discount = cart.discountCodes[0];

    if (!discount.applicable) {
      setCouponError('This discount code is not applicable to the current cart');
      return;
    }

    // Calculate the actual discount amount (positive number)
    const subtotalAmount = parseFloat(cart.cost.subtotalAmount.amount);
    const totalAmount = parseFloat(cart.cost.totalAmount.amount);
    const discountAmount = Math.abs(subtotalAmount - totalAmount);

    setAppliedDiscount(discount);
    setCartCost({
      subtotalAmount: cart.cost.subtotalAmount,
      totalAmount: cart.cost.totalAmount,
      discountAmount: {
        amount: discountAmount.toFixed(2),
        currencyCode: cart.cost.subtotalAmount.currencyCode
      }
    });
    setCouponCode('');
    
  } catch (error) {
    console.error('Error applying discount code:', error);
    setCouponError('Failed to apply discount code. Please try again.');
  } finally {
    setLoading(false);
  }
};
    


// Update the JSX for displaying the discount
const removeCoupon = async () => {
    if (!cartId) return;

    try {
      const variables = { cartId, discountCodes: [] };
      const response = await shopifyFetch(APPLY_DISCOUNT_CODE, variables);

      if (!response.errors && response.data?.cartDiscountCodesUpdate?.cart) {
        const { cart } = response.data.cartDiscountCodesUpdate;
        setAppliedDiscount(null);
        setCartCost({
          subtotalAmount: cart.cost.subtotalAmount,
          totalAmount: cart.cost.totalAmount
        });
      }
    } catch (error) {
      console.error('Error removing coupon:', error);
    }
};

  
 
    
      // Inside the CartPage component, add this helper function
const calculateItemTotal = (price: string, quantity: number): number => {
  // Remove any currency symbols and convert to number
  const cleanPrice = parseFloat(price.replace(/[^0-9.-]+/g, ''));
  return cleanPrice * quantity;
};

const calculateCartTotals = (items: Record<string, CartItem>) => {
  const subtotal = Object.values(items).reduce((sum, item) => {
    const cleanPrice = parseFloat(item.price.replace(/[^0-9.-]+/g, ''));
    return sum + (cleanPrice * item.quantity);
  }, 0);
  setCartTotal(subtotal);
};

useEffect(() => {
  calculateCartTotals(cartItems);
}, [cartItems]);

const formatShopifyPrice = (price: string) => {
  return (parseFloat(price)).toFixed(2);
};

      return (
        
        <div className="max-w-screen-xl mx-auto px-4 py-8">
               <Header />

          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Cart Items Section */}
              <div className="lg:w-2/3">
                {Object.keys(cartItems).length === 0 ? (
                  <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <p className="text-black">Your cart is empty.</p>
                    <button
                      onClick={() => router.push('/')}
                      className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(cartItems).map(([productId, item]) => (
                      <div 
                        key={productId} 
                        className="bg-white p-6 rounded-lg shadow-md transition-all hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            <div className="relative w-24 h-24">
                              <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg text-black">{item.title}</h3>
                              <p className="text-black font-medium">
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateQuantity(productId, item.quantity - 1)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                disabled={item.quantity <= 1}
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(productId, item.quantity + 1)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                              >
                                +
                              </button>
                            </div>
                            
                            <p className="font-medium min-w-[100px] text-right">
                              {formatCurrency(calculateItemTotal(item.price, item.quantity))}
                            </p>
                            
                            <button
                              onClick={() => removeItem(productId)}
                              className="text-red-500 hover:text-red-600 transition-colors p-2"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Summary Section */}
              {Object.keys(cartItems).length > 0 && (
                <div className="lg:w-1/3">
                  <div className="bg-white p-6 rounded-lg shadow-md sticky top-24 transition-all">
                    <h2 className="text-xl font-bold mb-6">Order Summary</h2>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-black">
                        <span>Subtotal ({Object.keys(cartItems).length} items)</span>
                        <span>{formatCurrency(cartTotal)}</span>
                      </div>
                      
                      {cartCost?.discountAmount && (
                        <div className="flex justify-between text-black">
                          <span>Discount</span>
                          <span>-{formatCurrency(parseFloat(cartCost.discountAmount.amount))}</span>
                        </div>
                      )}
                      
                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between font-bold text-lg text-black">
                          <span>Total</span>
                          <span>
                            {formatCurrency(
                              cartCost?.totalAmount.amount 
                                ? parseFloat(cartCost.totalAmount.amount) 
                                : cartTotal
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Discount Code Section */}
                    {appliedDiscount ? (
                      <div className="mb-6 p-3 bg-green-50 rounded-md">
                        <div className="flex justify-between items-center">
                          <p className="text-black">
                            Code applied: {appliedDiscount.code}
                          </p>
                          <button
                            onClick={removeCoupon}
                            className="text-sm text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder="Enter discount code"
                            className="flex-1 p-2 border rounded-md"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                          >
                            Apply
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-red-500 text-sm mt-2">{couponError}</p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => router.push('/Pages/ShippingDetails')}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    };
    
    export default CartPage;
