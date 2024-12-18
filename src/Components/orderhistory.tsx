'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';

interface Fulfillment {
    trackingCompany: string;
    trackingNumbers: string[];
    trackingUrls: string[];
  }
  
  interface OrderItem {
    title: string;
    quantity: number;
    variant: {
      image: {
        url: string;
      };
      price: {
        amount: string;
        currencyCode: string;
      };
    };
  }
  
  interface Order {
    id: string;
    name: string;
    orderNumber: string;
    processedAt: string;
    financialStatus: string;
    fulfillmentStatus: string;
    totalPriceV2: {
      amount: string;
      currencyCode: string;
    };
    fulfillments: Fulfillment[];
    lineItems: {
      edges: Array<{
        node: OrderItem;
      }>;
    };
  }
export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('useraccessToken');
    console.log('Token exists in localStorage:', !!token);
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
      
        setAccessToken(parsedToken.accessToken);
      } catch (error) {
        console.error('Error parsing token:', error);
        setError('Invalid token format');
      }
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchOrders();
    }
  }, [accessToken]);

  const fetchOrders = async () => {
    try {
      console.log('Starting fetchOrders');
       
      if (!accessToken) {
        setError('Please log in to view your order history');
        setLoading(false);
        return;
      }

      console.log('Making API request...');
      
      const response = await fetch('/api/shopify/orderhistory', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', errorData);
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
   
      
      if (data.success && data.orders) {
        const ordersList = data.orders || [];
        console.log('Processed orders:', ordersList.length);
        setOrders(ordersList);
      } else {
        console.error('No orders in response:', data);
        setError('No orders found in response');
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">No orders found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order History</h1>
      <div className="space-y-6">
        {orders.map((order) => (
          <Link 
            href={`/Pages/orders/${order.orderNumber}`}
            key={order.id} 
            className="block border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">Order #{order.orderNumber}</h2>
                <p className="text-gray-600">
                  {format(new Date(order.processedAt), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm">
                  Status: <span className="capitalize">{order.fulfillmentStatus.toLowerCase()}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {parseFloat(order.totalPriceV2.amount).toFixed(2)} {order.totalPriceV2.currencyCode}
                </p>
                <p className="text-sm text-gray-600 capitalize">
                  {order.financialStatus.toLowerCase()}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {order.lineItems.edges.map(({ node: item }, index) => (
                <div key={index} className="flex space-x-4">
                  <div className="relative w-20 h-20">
                    <Image
                      src={item.variant.image.url}
                      alt={item.title}
                      fill
                      className="object-cover rounded"
                      sizes="(max-width: 80px) 100vw, 80px"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-sm">
                      {parseFloat(item.variant.price.amount).toFixed(2)} {item.variant.price.currencyCode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-blue-600">
              Click to view order details →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}