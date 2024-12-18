"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Address {
  id?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

const ShippingDetails = () => {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    zip: '',
    country: '',
    phone: '',
  });

  useEffect(() => {
    // Get customer data from localStorage
    const customerData = localStorage.getItem('customerData');
    if (customerData) {
      const { firstName, lastName } = JSON.parse(customerData);
      setFormData(prev => ({
        ...prev,
        firstName,
        lastName,
      }));
    }
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const token = localStorage.getItem('useraccessToken');
    if (!token) return;

    try {
      const { accessToken } = JSON.parse(token);
      const response = await fetch('/api/shopify/customer/addresses', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch addresses');

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddressSelect = (addressId: string) => {
    const selectedAddress = addresses.find(addr => addr.id === addressId);
    if (selectedAddress) {
      setSelectedAddressId(addressId);
      setFormData(prev => ({
        ...prev,
        address1: selectedAddress.address1,
        address2: selectedAddress.address2 || '',
        city: selectedAddress.city,
        province: selectedAddress.province,
        zip: selectedAddress.zip,
        country: selectedAddress.country,
        phone: selectedAddress.phone || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Store shipping details in localStorage for order creation
      const shippingDetails = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        address1: formData.address1,
        address2: formData.address2,
        city: formData.city,
        province: formData.province,
        zip: formData.zip,
        country: formData.country,
        phone: formData.phone
      };

      // Store shipping details for later use in order creation
      localStorage.setItem('shippingDetails', JSON.stringify(shippingDetails));

      // Get cart cost for payment page
      const cartItems = JSON.parse(localStorage.getItem('cartItems') || '{}');
      const cartCost = {
        totalAmount: {
          amount: Object.values(cartItems).reduce((total: number, item: any) => {
            const price = parseFloat(item.price.replace(/[^0-9.-]+/g, ''));
            return total + (price * item.quantity);
          }, 0),
          currencyCode: 'INR'
        }
      };

      // Store cart cost for payment page
      localStorage.setItem('cartCost', JSON.stringify(cartCost));

      // Redirect to payment page
      router.push('/Pages/PaymentPage');
    } catch (error) {
      console.error('Submission error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while processing your shipping details.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center text-black mb-8">
          Shipping Details
        </h1>

        {addresses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl  text-black font-semibold mb-4">Saved Addresses</h2>
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`p-4 border rounded-lg  text-black cursor-pointer ${
                    selectedAddressId === address.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => handleAddressSelect(address.id!)}
                >
                  <p>{address.address1}</p>
                  {address.address2 && <p>{address.address2}</p>}
                  <p>{address.city}, {address.province} {address.zip}</p>
                  <p>{address.country}</p>
                  {address.phone && <p>Phone: {address.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowNewAddressForm(!showNewAddressForm)}
          className="w-full mb-6 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          {showNewAddressForm ? 'Use Existing Address' : 'Add New Address'}
        </button>

        {showNewAddressForm && (
          <form onSubmit={handleSubmit} className="bg-white p-6  text-black rounded-lg shadow-md space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="  text-black text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium  text-black text-gray-700">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Street Address</label>
              <input
                type="text"
                name="address1"
                value={formData.address1}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Apartment, suite, etc.</label>
              <input
                type="text"
                name="address2"
                value={formData.address2}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Province/State</label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Postal/ZIP Code</label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </form>
        )}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Back
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
            }}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingDetails;