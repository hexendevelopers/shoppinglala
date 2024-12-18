"use client";
import React, { useState, useEffect } from "react";

const PersonalInformation: React.FC = () => {
  const [userDetails, setUserDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",

  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('useraccessToken');
    if (token) {
      setAccessToken(JSON.parse(token).accessToken);
    }
  }, []);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!accessToken) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/shopify/customer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch user details');
        }

        console.log('Customer data received:', data);

        if (data.success && data.customer) {
          console.log('Setting user details:', data.customer);
          setUserDetails({
            firstName: data.customer.firstName || "",
            lastName: data.customer.lastName || "",
            email: data.customer.email || "",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [accessToken]);

  const handleSave = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await fetch('/api/shopify/customer/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          customer: userDetails
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user details');
      }

      if (data.success) {
        setIsEditing(false);
        // You might want to show a success message here
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user details');
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="text-black py-4 text-center bg-yellow-50 rounded-lg">
        <p className="font-medium">Please log in to view your information</p>
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
      <h1 className="text-2xl font-bold text-black mb-4">Personal Information</h1>
      <div className="space-y-4">
        {Object.keys(userDetails).map((key) => (
          <div key={key}>
            <label className="block font-medium  text-black mb-1">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
            {isEditing ? (
              <input
                type="text"
                value={(userDetails as any)[key]}
                onChange={(e) =>
                  setUserDetails({ ...userDetails, [key]: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
            ) : (
              <p className="p-2 border rounded text-black bg-gray-100">{(userDetails as any)[key]}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6">
        {isEditing ? (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-black rounded hover:bg-blue-600"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalInformation;