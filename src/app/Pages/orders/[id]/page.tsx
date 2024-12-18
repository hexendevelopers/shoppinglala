'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ShippingAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
}

interface TrackingInfo {
  number: string;
  url: string;
}

interface Fulfillment {
  trackingCompany: string;
  trackingInfo: TrackingInfo[];
}

interface Order {
  id: string;
  name: string;
  orderNumber: string;
  totalPriceV2: {
    amount: string;
    currencyCode: string;
  };
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  shippingAddress?: ShippingAddress;
  successfulFulfillments: Fulfillment[];
  lineItems: {
    edges: {
      node: {
        variant: {
          image: {
            url: string;
          };
          price: {
            amount: string;
            currencyCode: string;
          };
        };
        title: string;
        quantity: number;
      };
    }[];
  };
  cancelReason?: string;
  canceledAt?: string;
}

const OrderDetails = () => {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const storedToken = localStorage.getItem('useraccessToken');
        if (!storedToken) throw new Error('Please log in to view order details');

        const parsedToken = JSON.parse(storedToken);
        const accessToken = parsedToken?.accessToken;
        if (!accessToken) throw new Error('Invalid token format');


        
         


        const orderNumber = params?.id;
        if (!orderNumber) throw new Error('Invalid order number');

       // First log the order number
console.log("My order number is:", orderNumber);

// Then make the fetch call with proper options
const response = await fetch(`/api/shopify/orders/${orderNumber}`, {
    headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    },
});

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch order details: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          throw new Error(data.message || 'Order not found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load order details';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      fetchOrderDetails();
    }
  }, [params?.id]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setIsCancelling(true);
    try {
      const storedToken = localStorage.getItem('useraccessToken');
      if (!storedToken) throw new Error('Please log in to cancel order');

      const parsedToken = JSON.parse(storedToken);
      const accessToken = parsedToken?.accessToken;
      if (!accessToken) throw new Error('Invalid token format');

      // Extract the numeric ID from the full Shopify GID
      const orderId = order?.id.split('/').pop()?.split('?')[0];
      console.log('Attempting to cancel order with ID:', orderId);

      const response = await fetch(`/api/shopify/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to cancel order: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh the order details
        window.location.reload();
      } else {
        throw new Error(data.message || 'Failed to cancel order');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      setError(errorMessage);
    } finally {
      setIsCancelling(false);
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

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-black">Order not found</div>
      </div>
    );
  }

  const getStatusStyle = (status: string, type: 'financialStatus' | 'fulfillmentStatus') => {
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus === 'paid' || lowercaseStatus === 'fulfilled') {
      return { backgroundColor: '#DEF7EC', color: '#03543F' };
    }
    return type === 'financialStatus' 
      ? { backgroundColor: '#FDE8E8', color: '#9B1C1C' }
      : { backgroundColor: '#FEF3C7', color: '#92400E' };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/Pages/Myaccount" className="text-black hover:text-blue-800 mb-6 inline-block">
        ← Back to Orders
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="border-b pb-6 mb-6">
          <h1 className="text-3xl text-black font-bold mb-2">Order #{order?.orderNumber}</h1>
          <p className="text-gray-600">
            Placed on {format(new Date(order?.processedAt), 'MMMM d, yyyy')}
          </p>
          
          {/* Status and Cancel Button Section */}
          <div className="mt-4 flex gap-4 items-center">
            {/* Order Status */}
            {['financialStatus', 'fulfillmentStatus'].map((status) => (
              <span
                key={status}
                className="px-3 py-1 rounded-full text-sm font-medium capitalize"
                style={getStatusStyle(order?.[status as keyof Order] as string, status as any)}
              >
                {(order?.[status as keyof Order] as string).toLowerCase()}
              </span>
            ))}
            
            {/* Cancel Button */}
            {order?.financialStatus.toUpperCase() !== 'CANCELED' && 
             order?.financialStatus.toUpperCase() !== 'REFUNDED' &&
             order?.financialStatus.toUpperCase() !== 'PARTIALLY_REFUNDED' &&
             order?.fulfillmentStatus.toUpperCase() !== 'FULFILLED' && (
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className={`px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 
                         disabled:bg-gray-400 disabled:cursor-not-allowed ml-auto`}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>

        {order?.shippingAddress && (
          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl text-black font-semibold mb-4">Shipping Address</h2>
            <div className="text-black">
              <p>{order?.shippingAddress.address1}</p>
              {order?.shippingAddress.address2 && <p>{order?.shippingAddress.address2}</p>}
              <p>
                {order?.shippingAddress.city}, {order?.shippingAddress.province} {order?.shippingAddress.zip}
              </p>
              <p>{order?.shippingAddress.country}</p>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl text-black font-semibold mb-4">Order Items</h2>
          <div className="space-y-6">
            {order?.lineItems.edges.map(({ node: item }, index) => (
              <div key={index} className="flex items-start border-b pb-6 last:border-0">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <Image
                    src={item.variant.image.url}
                    alt={item.title}
                    fill
                    className="object-cover rounded"
                    sizes="(max-width: 80px) 100vw, 80px"
                  />
                </div>
                <div className="ml-6 flex-grow text-black">
                  <h3 className="font-medium text-black">{item.title}</h3>
                  <p className="text-black">Quantity: {item.quantity}</p>
                  <p className="text-black">
                    {parseFloat(item.variant.price.amount).toFixed(2)} {item.variant.price.currencyCode}
                  </p>
                </div>
              </div>
            ))}

            {order?.successfulFulfillments && order?.successfulFulfillments.length > 0 && (
              <div className="border-b pb-6 mb-6">
                <h2 className="text-xl text-black font-semibold mb-4">Tracking Information</h2>
                {order?.successfulFulfillments.map((fulfillment, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    {fulfillment.trackingCompany && (
                      <p className="text-black mb-1">
                        Shipping Company: {fulfillment.trackingCompany}
                      </p>
                    )}
                    {fulfillment.trackingInfo.map((tracking, idx) => (
                      <div key={idx} className="mb-1">
                        <p className="text-black">
                          Tracking Number: {tracking.number}
                          {tracking.url && (
                            <a
                              href={tracking.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              Track Package →
                            </a>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 text-right">
            <p className="text-lg text-black font-semibold">
              Total: {parseFloat(order?.totalPriceV2.amount).toFixed(2)} {order?.totalPriceV2.currencyCode}
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation Loading Overlay */}
      {isCancelling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-center text-gray-700">Cancelling order...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;