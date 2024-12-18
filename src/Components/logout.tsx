"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const Logout: React.FC = () => {
  const router = useRouter();

  const handleLogout = () => {
    // Clear any authentication tokens from localStorage
    localStorage.removeItem('usertoken');
    localStorage.removeItem('useraccessToken');

    
    // Clear any other auth-related data if needed
    
    // Redirect to login page
    router.push('/Pages/loginpage');
  };

  return (
    <button 
    className="bg-red-500 text-white p-2 rounded-md"
      onClick={handleLogout}
     >
      Logout
    </button>
  );
};

export default Logout;
