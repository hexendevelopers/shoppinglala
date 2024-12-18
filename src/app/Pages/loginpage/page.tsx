"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../Components/Header';
import * as Icon from "@phosphor-icons/react/dist/ssr";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Input validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    try {
      const response = await fetch('/api/shopify/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      
      // Debug log
      console.log('Login response:', result);

      if (!result.success) {
        let errorMessage = result.message || 'Login failed';
        
        if (result.errors) {
          const errors = Array.isArray(result.errors) ? result.errors : [result.errors];
          const errorMessages = errors.map((err: any) => {
            if (err.message) return err.message;
            if (err.field) return `Error in ${err.field}`;
            return JSON.stringify(err);
          });
          errorMessage = errorMessages.join('. ');
        }
        
        setError(errorMessage);
        return;
      }

      // Safely access customer data from the correct path in the response
      const customerData = result.data?.customer;
      const accessToken = result.data?.accessToken;
      
      if (!customerData || !accessToken) {
        setError('Invalid response format from server');
        return;
      }

      // Store customer data
      localStorage.setItem('customerData', JSON.stringify({
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone
      }));

      // Store user ID
      localStorage.setItem('usertoken', JSON.stringify({
        userId: customerData.id
      }));

      // Store access token
      localStorage.setItem('useraccessToken', JSON.stringify({
        accessToken: accessToken
      }));

      setSuccessMessage('Login successful! Redirecting...');
      
      // Add a delay before redirect for better UX
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again later.');
    }
  };
 

 
  return (
       
       <div className="login-block md:py-20 py-10 text-black">
        <Header />
        <div className="container">
          <div className="content-main flex gap-y-8 max-md:flex-col">
            {/* Left Section - Login Form */}
            <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
              <div className="heading4">Login</div>
              <form className="md:mt-7 mt-4" onSubmit={handleSubmit}>
                <div className="email">
                  <input 
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg" 
                    id="email" 
                    type="email" 
                    placeholder="Username or email address *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                <div className="pass mt-5">
                  <input 
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg" 
                    id="password" 
                    type="password" 
                    placeholder="Password *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                <div className="flex items-center justify-between mt-5">
                  <div className='flex items-center'>
                    <div className="block-input">
                      <input
                        type="checkbox"
                        name='remember'
                        id='remember'
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <Icon.CheckSquare size={20} weight='fill' className='icon-checkbox' />
                    </div>
                    <label htmlFor='remember' className="pl-2 cursor-pointer">Remember me</label>
                  </div>
                  <Link href={'/Pages/forgot-password'} className='font-semibold hover:underline'>
                    Forgot Your Password?
                  </Link>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-center text-sm text-red-600">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-center text-sm text-green-600">{successMessage}</p>
                  </div>
                )}

                <div className="block-button md:mt-7 mt-4">
                  <button type="submit" className="bg-black text-white px-4 py-2 rounded-md">
                    Login
                  </button>
                </div>
              </form>
            </div>

            {/* Right Section - New Customer */}
            <div className="right md:w-1/2 w-full lg:pl-[60px] md:pl-[40px] flex items-center">
              <div className="text-content">
                <div className="heading4">New Customer</div>
                <div className="mt-2 text-secondary">
                  Be part of our growing family of new customers! Join us today and unlock a world of exclusive benefits, offers, and personalized experiences.
                </div>
                <div className="block-button md:mt-7 mt-4">
                  <Link href={'/Pages/Registerpage'} className="bg-black text-white px-4 py-2 rounded-md">
                    Register
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
   );
};

export default LoginPage;