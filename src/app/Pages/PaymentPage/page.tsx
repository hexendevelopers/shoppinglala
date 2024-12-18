"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentPage = () => {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [amount, setAmount] = useState(0);
  const [customerData, setCustomerData] = useState<any>(null);

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

      if (typeof window.Razorpay !== 'undefined') {
        setIsReady(true);
      }
    } catch (error) {
      console.error('Error initializing payment page:', error);
      alert('Error loading payment information');
      router.push('/cart');
    }
  }, [router]);

  const createShopifyOrder = async (paymentResponse: any) => {
    try {
      const cartItems = localStorage.getItem('cartItems');
      const userAccessToken = localStorage.getItem('useraccessToken');
      const cartCost = localStorage.getItem('cartCost');
      const shippingDetails = localStorage.getItem('shippingDetails');
      const customerData = localStorage.getItem('customerData');
      
      if (!cartItems || !userAccessToken || !cartCost || !shippingDetails || !customerData) {
        throw new Error('Missing required data for order creation');
      }

      const parsedCartItems = JSON.parse(cartItems);
      const parsedShippingDetails = JSON.parse(shippingDetails);
      const parsedCustomerData = JSON.parse(customerData);
      const { totalAmount } = JSON.parse(cartCost);

      const address = {
        first_name: parsedShippingDetails.firstName,
        last_name: parsedShippingDetails.lastName,
        address1: parsedShippingDetails.address1,
        address2: parsedShippingDetails.address2 || '',
        city: parsedShippingDetails.city,
        province: parsedShippingDetails.province,
        country: parsedShippingDetails.country,
        zip: parsedShippingDetails.zip,
        phone: parsedShippingDetails.phone
      };

      const orderData = {
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        amount: totalAmount.amount,
        currency: totalAmount.currencyCode || 'INR',
        customerDetails: {
          firstName: parsedShippingDetails.firstName,
          lastName: parsedShippingDetails.lastName,
          email: parsedCustomerData.email,
          phone: parsedShippingDetails.phone,
          billingAddress: address,
          shippingAddress: address
        },
        lineItems: Object.values(parsedCartItems).map((item: any) => ({
          variant_id: item.variantId.split('/').pop(),
          quantity: item.quantity,
          price: item.price
        }))
      };

      console.log('Sending order data:', orderData);

      const response = await fetch('/api/shopify/createOrder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAccessToken}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creating order');
      }

      const data = await response.json();

      // Clear cart data only after successful order creation
      localStorage.removeItem('cartItems');
      localStorage.removeItem('cartCost');

      return data;
    } catch (error: any) {
      console.error('Detailed error creating Shopify order:', {
        error: error.message,
        stack: error.stack,
        cartData: {
          rawCartItems: localStorage.getItem('cartItems'),
          parsedCartItems: localStorage.getItem('cartItems') ? JSON.parse(localStorage.getItem('cartItems')!) : null
        },
        paymentResponse
      });
      throw new Error(`Failed to create order: ${error.message}`);
    }
  };

  const handlePayment = async () => {
    try {
      if (!isReady) {
        alert('Payment system is initializing. Please try again.');
        return;
      }

      const cartCost = localStorage.getItem('cartCost');
      if (!cartCost) {
        throw new Error('Cart cost information is missing');
      }

      const { totalAmount } = JSON.parse(cartCost);
      const amountInPaise = Math.round(parseFloat(totalAmount.amount) ); // Convert to paise

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
            console.log('Payment successful, creating order...');
            const orderResult = await createShopifyOrder(response);
            
            if (!orderResult) {
              throw new Error('No order result received');
            }

            // Store the order ID
            localStorage.setItem('lastOrderId', orderResult.shopifyOrderId.toString());

            console.log('Order created successfully:', orderResult);
            alert('Order placed successfully!');
            router.push('/Pages/OrderConfirmation');
          } catch (error: any) {
            console.error('Order processing error:', error);
            alert('Payment successful but order processing failed. Our team will contact you shortly. Reference ID: ' + response.razorpay_payment_id);
            // You might want to store failed orders in a separate system for follow-up
            try {
              await fetch('/api/orders/failed', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id,
                  error: error.message,
                  cartData: {
                    items: localStorage.getItem('cartItems'),
                    cost: localStorage.getItem('cartCost'),
                    customerData: localStorage.getItem('customerData')
                  }
                })
              });
            } catch (e) {
              console.error('Failed to log failed order:', e);
            }
          }
        },
        prefill: {
          name: customerData?.name || '',
          email: customerData?.email || '',
          contact: customerData?.phone || ''
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