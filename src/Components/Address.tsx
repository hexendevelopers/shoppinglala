"use client";
import React, { useState, useEffect } from "react";

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

const Address: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<Address>({
    address1: "",
    city: "",
    province: "",
    zip: "",
    country: "",
    phone: "",
  });
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('useraccessToken');
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        setAccessToken(parsedToken.accessToken);
      } catch (err) {
        setError('Invalid access token format');
      }
    }
  }, []);

  const fetchAddresses = async () => {
    const token = localStorage.getItem('useraccessToken');
    if (!token) {
      setError('Access token is required');
      return;
    }

    let parsedToken;
    try {
      parsedToken = JSON.parse(token).accessToken;
    } catch (err) {
      setError('Invalid access token format');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shopify/customer/addresses', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parsedToken}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch addresses');
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSave = async (address: Address) => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await fetch('/api/shopify/customer/addresses/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update address');
      }

      if (data.success) {
        setIsEditing(null);
        setIsAdding(false);
        // Refresh addresses
        const updatedAddresses = addresses.map(addr => 
          addr.id === address.id ? address : addr
        );
        setAddresses(updatedAddresses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const token = localStorage.getItem('useraccessToken');
    if (!token) {
      setError('Access token is required. Please log in again.');
      return;
    }

    let parsedToken;
    try {
      parsedToken = JSON.parse(token);
      if (!parsedToken?.accessToken) {
        throw new Error('Invalid token format');
      }
    } catch (err) {
      setError('Invalid access token format');
      return;
    }

    if (!currentAddress.address1 || !currentAddress.city || !currentAddress.province || 
        !currentAddress.country || !currentAddress.zip) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shopify/customer/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: parsedToken.accessToken,
          address: currentAddress
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add address');
      }

      const data = await response.json();
      
      if (data.success) {
        setIsAdding(false);
        setAddresses([...addresses, data.address]);
        setCurrentAddress({
          address1: "",
          city: "",
          province: "",
          zip: "",
          country: "",
          phone: "",
        });
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to add address');
      }
    } catch (err) {
      console.error('Error adding address:', err);
      setError(err instanceof Error ? err.message : 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    const token = localStorage.getItem('useraccessToken');
    if (!token) {
      setError('Access token is required. Please log in again.');
      return;
    }

    let parsedToken;
    try {
      parsedToken = JSON.parse(token);
      if (!parsedToken?.accessToken) {
        throw new Error('Invalid token format');
      }
    } catch (err) {
      setError('Invalid access token format');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shopify/customer/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: parsedToken.accessToken,
          addressId,
          action: 'delete'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete address');
      }

      const data = await response.json();

      if (data.success) {
        setAddresses(addresses.filter(addr => addr.id !== addressId));
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to delete address');
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete address');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (address: Address) => {
    setEditingAddress(address);
    setCurrentAddress(address);
    setIsEditing(address.id || null);
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('useraccessToken');
    if (!token) {
      setError('Access token is required. Please log in again.');
      return;
    }

    let parsedToken;
    try {
      parsedToken = JSON.parse(token);
      if (!parsedToken?.accessToken) {
        throw new Error('Invalid token format');
      }
    } catch (err) {
      setError('Invalid access token format');
      return;
    }

    if (!currentAddress.address1 || !currentAddress.city || !currentAddress.province || 
        !currentAddress.country || !currentAddress.zip) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shopify/customer/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: parsedToken.accessToken,
          addressId: isEditing,
          address: currentAddress
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update address');
      }

      const data = await response.json();
      
      if (data.success) {
        setIsEditing(null);
        setEditingAddress(null);
        setAddresses(addresses.map(addr => 
          addr.id === isEditing ? data.address : addr
        ));
        setCurrentAddress({
          address1: "",
          city: "",
          province: "",
          zip: "",
          country: "",
          phone: "",
        });
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to update address');
      }
    } catch (err) {
      console.error('Error updating address:', err);
      setError(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="text-black py-4 text-center bg-yellow-50 rounded-lg">
        <p className="font-medium">Please log in to view your addresses</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 py-4 text-center bg-red-50 rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-black">My Addresses</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
        >
          Add New Address
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Add New Address</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black">Address Line 1</label>
              <input
                type="text"
                value={currentAddress.address1}
                onChange={(e) => setCurrentAddress({ ...currentAddress, address1: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">City</label>
              <input
                type="text"
                value={currentAddress.city}
                onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">Province/State</label>
              <input
                type="text"
                value={currentAddress.province}
                onChange={(e) => setCurrentAddress({ ...currentAddress, province: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">Postal/ZIP Code</label>
              <input
                type="text"
                value={currentAddress.zip}
                onChange={(e) => setCurrentAddress({ ...currentAddress, zip: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">Country</label>
              <input
                type="text"
                value={currentAddress.country}
                onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">Phone</label>
              <input
                type="text"
                value={currentAddress.phone}
                onChange={(e) => setCurrentAddress({ ...currentAddress, phone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-500 text-black rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-gray-500 text-black rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((address) => (
          <div key={address.id} className="mb-4 p-4 border rounded-lg">
            {isEditing === address.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black">Address Line 1</label>
                  <input
                    type="text"
                    value={currentAddress.address1}
                    onChange={(e) => setCurrentAddress({ ...currentAddress, address1: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    value={currentAddress.address2 || ''}
                    onChange={(e) => setCurrentAddress({ ...currentAddress, address2: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">City</label>
                  <input
                    type="text"
                    value={currentAddress.city}
                    onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Province/State</label>
                  <input
                    type="text"
                    value={currentAddress.province}
                    onChange={(e) => setCurrentAddress({ ...currentAddress, province: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Postal/ZIP Code</label>
                  <input
                    type="text"
                    value={currentAddress.zip}
                    onChange={(e) => setCurrentAddress({ ...currentAddress, zip: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Country</label>
                  <input
                    type="text"
                    value={currentAddress.country}
                    onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Phone (Optional)</label>
                  <input
                    type="text"
                    value={currentAddress.phone || ''}
                    onChange={(e) => setCurrentAddress({ ...currentAddress, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={handleUpdate}
                    className="px-4 py-2 bg-blue-500 text-black rounded hover:bg-blue-600"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(null);
                      setEditingAddress(null);
                      setCurrentAddress({
                        address1: "",
                        city: "",
                        province: "",
                        zip: "",
                        country: "",
                        phone: "",
                      });
                    }}
                    className="px-4 py-2 bg-gray-500 text-black rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-black">
                  <p>{address.address1}</p>
                  {address.address2 && <p>{address.address2}</p>}
                  <p>{address.city}, {address.province} {address.zip}</p>
                  <p>{address.country}</p>
                  {address.phone && <p>Phone: {address.phone}</p>}
                </div>
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={() => handleEditClick(address)}
                    className="px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address.id!)}
                    className="px-4 py-2 bg-red-500 text-black rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Address;