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
      setLoading(true);
      if (!accessToken) {
        setError('Please log in to view your order history');
        return;
      }

      const response = await fetch('/api/shopify/orderhistory', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok || !data.success || !data.orders) {
        throw new Error(data.message || 'Failed to fetch orders');
      }

      setOrders(data.orders);
      setError('');
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <p>Loading orders...</p>
        
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  <Link href={`/Pages/orders/${order.orderNumber}`} className="hover:text-blue-600">
                    Order #{order.orderNumber}
                  </Link>
                </h3>
                <p className="text-gray-600">
                  {format(new Date(order.processedAt), 'MMM dd, yyyy')}
                </p>
              </div>
              <div className="grid gap-4">
                {order.lineItems.edges.map(({ node: item }) => (
                  <div key={item.title} className="flex items-center space-x-4">
                    {item.variant?.image?.url ? (
                      <div className="relative w-20 h-20">
                        <Image
                          src={item.variant.image.url}
                          alt={item.title}
                          fill
                          className="object-cover rounded"
                          sizes="(max-width: 80px) 100vw, 80px"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                      {item.variant?.price && (
                        <p className="text-gray-600">
                          Price: {item.variant.price.currencyCode} {item.variant.price.amount}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="font-semibold">
                  Total: {order.totalPriceV2.currencyCode} {order.totalPriceV2.amount}
                </p>
                <div className="text-gray-600">
                  <p>Fulfillment Status: {order.fulfillmentStatus || 'Unfulfilled'}</p>
                  <p>Payment Status: {order.financialStatus || 'Unknown'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
