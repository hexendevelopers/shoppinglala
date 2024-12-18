"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApolloProvider } from '@apollo/client';
import { client } from '../../../../lib/apollo-client';
import PersonalInformation from '../../../Components/personalinformation';
import Address from '../../../Components/Address';
import OrderHistory from '../../../Components/orderhistory';
import Header from "../../../Components/Header";
import Logout from '../../../Components/logout';

const MyAccountPage = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const accessToken = localStorage.getItem("useraccessToken");
      if (!accessToken) {
        router.push('/pages/loginpage');
      } else {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error('Error checking authentication:', e);
      router.push('/pages/loginpage');
    }
  }, [router]);

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null;
  }

  // Only render the content if authenticated
  return (
    <ApolloProvider client={client}>
      <div className="containe text-black mx-auto p-4">
      <Header />

        <h1 className="text-2xl font-bold mb-4">My Account</h1>
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="space-y-4">
          <div>
              <h2 className="text-xl font-semibold">Order History</h2>
              <OrderHistory />
             </div>
            <div>
              <h2 className="text-xl font-semibold">Profile Information</h2>
              <PersonalInformation />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Address</h2>
              <Address />
            </div>
            <Logout />
          </div>
        </div>
      </div>
    </ApolloProvider>
  );
};

export default MyAccountPage;
