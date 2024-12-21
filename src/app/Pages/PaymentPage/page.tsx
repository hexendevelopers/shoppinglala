"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

// Define proper types
interface CustomerData {
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
}

interface CartItem {
  variantId: string | number;
  quantity: number;
  title: string;
  price: string;
  handle?: string;
  image?: string;
  variant?: {
    id?: number;
    title?: string;
    sku?: string;
    image?: {
      url?: string;
    };
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentPage = () => {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [amount, setAmount] = useState(0);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  useEffect(() => {
    try {
      const cartCost = localStorage.getItem('cartCost');
      const shippingDetails = localStorage.getItem('shippingDetails');
      const usertoken = localStorage.getItem('usertoken');

      if (!cartCost || !shippingDetails || !usertoken) {
        alert('Missing required information. Please try again.');
        router.push('/cart');
        return;
      }

      const { totalAmount } = JSON.parse(cartCost);
      const addressDetails = JSON.parse(shippingDetails);

      setAmount(Math.round(parseFloat(totalAmount.amount)));
      setCustomerData({
        ...addressDetails,
        address: addressDetails.address1,
        state: addressDetails.province,
        pinCode: addressDetails.zip,
        contact: addressDetails.phone
      });
    } catch (error) {
      console.error('Error initializing payment page:', error);
      alert('Error loading payment information');
      router.push('/cart');
    }
  }, [router]);

  const createShopifyOrder = async (paymentResponse: { razorpay_payment_id: string }) => {
    try {
      // First validate cart items
      const cartItems = localStorage.getItem('cartItems');
      if (!cartItems) {
        throw new Error('Cart is empty');
      }

      // Get customer data first
      const customerDataStr = localStorage.getItem('customerData');
      const shippingDetailsStr = localStorage.getItem('shippingDetails');
      
      console.log('Raw customer data:', customerDataStr);
      console.log('Raw shipping details:', shippingDetailsStr);

      if (!customerDataStr || !shippingDetailsStr) {
        throw new Error('Missing customer or shipping information');
      }

      const customerData = JSON.parse(customerDataStr);
      const shippingDetails = JSON.parse(shippingDetailsStr);
      
      // Use email from customerData
      if (!customerData.email) {
        throw new Error('Customer email is required');
      }

      // Combine customer data with shipping details
      const customerDetails = {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email, // Use email from customerData
        shippingDetails: {
          address1: shippingDetails.address1,
          address2: shippingDetails.address2 || '',
          city: shippingDetails.city,
          province: shippingDetails.province,
          zip: shippingDetails.zip,
          country: shippingDetails.country || 'IN',
          phone: customerData.phone // Use phone from customerData
        }
      };

      console.log('Combined customer details:', customerDetails);

      // Process cart items
      const parsedCartItems = JSON.parse(cartItems);
      const items = Array.isArray(parsedCartItems) 
        ? parsedCartItems 
        : Object.values(parsedCartItems);

      const lineItems = items.map((item: CartItem) => {
        let variantId: number;
        if (typeof item.variantId === 'number') {
          variantId = item.variantId;
        } else if (typeof item.variantId === 'string') {
          const cleanId = item.variantId.replace(/^gid:\/\/shopify\/ProductVariant\//, '');
          variantId = parseInt(cleanId, 10);
        } else if (item.variant?.id) {
          variantId = item.variant.id;
        } else {
          throw new Error(`Missing variant ID for item: ${item.title}`);
        }

        if (isNaN(variantId) || variantId === 0) {
          throw new Error(`Invalid variant ID for item: ${item.title}`);
        }

        return {
          variant_id: variantId,
          quantity: parseInt(item.quantity.toString()),
          price: item.price,
          requires_shipping: true,
          taxable: true,
          title: item.title
        };
      });

      const orderData = {
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        amount,
        customerDetails,
        lineItems
      };

      console.log('Sending order data:', JSON.stringify(orderData, null, 2));

      const response = await fetch('/api/shopify/createOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();
      console.log('API response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Clear cart after successful order
      localStorage.removeItem('cartItems');
      localStorage.removeItem('cartCost');

      return {
        orderId: data.shopifyOrderId,
        orderStatus: data.orderStatus
      };
    } catch (error) {
      console.error('Order creation error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  const handlePayment = async () => {
    if (!isReady || !customerData) {
      alert('Payment system is initializing. Please try again.');
      return;
    }

    try {
      const cartCost = localStorage.getItem('cartCost');
      if (!cartCost) {
        throw new Error('Cart cost information is missing');
      }

      const { totalAmount } = JSON.parse(cartCost);
      const amountInPaise = Math.round(parseFloat(totalAmount.amount));

      const response = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: amountInPaise,
          currency: totalAmount.currencyCode || 'INR'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Razorpay order');
      }

      const { order } = await response.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'SHOPPING LALA',
        description: 'Order Payment',
        order_id: order.id,
        handler: async function (response: any) {
          try {
            console.log('Payment response:', response);
            const orderResult = await createShopifyOrder(response);
            console.log('Order result:', orderResult);

            if (!orderResult?.orderId) {
              throw new Error('No order ID received');
            }

            localStorage.setItem('lastOrderId', orderResult.orderId.toString());
            alert('Order placed successfully!');
            router.push('/Pages/OrderConfirmation');
          } catch (error: any) {
            console.error('Order processing error:', {
              message: error.message,
              stack: error.stack,
              details: error
            });
            
            alert(`Payment successful but order processing failed. Please contact support with Reference ID: ${response.razorpay_payment_id}`);
            
            // Log failed order with more details
            try {
              await fetch('/api/orders/failed', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id,
                  error: error.message,
                  errorStack: error.stack,
                  cartData: {
                    items: localStorage.getItem('cartItems'),
                    cost: localStorage.getItem('cartCost'),
                    customerData: localStorage.getItem('shippingDetails')
                  }
                })
              });
            } catch (logError) {
              console.error('Failed to log error:', logError);
            }
          }
        },
        prefill: {
          name: customerData.name || '',
          email: customerData.email || '',
          contact: customerData.phone || ''
        },
        theme: {
          color: '#3399cc'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert('An error occurred while processing your payment.');
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setIsReady(true)}
        onError={() => {
          alert('Failed to load payment system');
          router.push('/cart');
        }}
      />
      
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Payment Details
          </h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <div className="text-center text-lg font-medium">
              Amount to Pay: ₹{amount}
            </div>

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={!isReady}
                className={`px-6 py-2 rounded-md transition-colors ${
                  isReady 
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isReady ? 'Pay Now' : 'Loading...'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;