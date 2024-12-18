"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/Components/Header';
import * as Icon from "@phosphor-icons/react/dist/ssr";

const RegisterForm = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add phone number validation function
  const validatePhone = (phoneNumber: string) => {
    // Remove any non-digit characters
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (10 digits)
    if (cleanPhone.length !== 10) {
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate phone number
    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    // Format phone number to E.164 format for Shopify
    const formattedPhone = '+91' + phone.replace(/\D/g, '');

    const data = { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone: formattedPhone 
    };

    try {
      const response = await fetch('/api/shopify/Register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        let errorMessage = result.message || 'Registration failed';
        
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
        console.error('Registration error details:', result); // For debugging
        return;
      }

      // Registration successful
      localStorage.setItem('customerData', JSON.stringify({
        firstName,
        lastName,
        email,
        phone: formattedPhone,
      }));

      localStorage.setItem('usertoken', JSON.stringify({
        userId: result.data.customerId,
      }));

      localStorage.setItem('useraccessToken', JSON.stringify({
        accessToken: result.data.accessToken,
      }));

      setSuccess('Registration successful! Redirecting...');
      
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <>
      <Header />
      <div className="register-block md:py-20 py-10 text-black">
        <div className="container">
          <div className="content-main flex gap-y-8 max-md:flex-col">
            <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
              <div className="heading4">Register</div>
              <form className="md:mt-7 mt-4" onSubmit={handleSubmit}>
                <div className="mt-5">
                  <input
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                    type="text"
                    placeholder="First Name *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="mt-5">
                  <input
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                    type="text"
                    placeholder="Last Name *"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="mt-5">
                  <input
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                    type="email"
                    placeholder="Email address *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mt-5">
                  <input
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                    type="password"
                    placeholder="Password *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mt-5">
                  <input
                    className="border-line px-4 pt-3 pb-3 w-full rounded-lg"
                    type="tel"
                    placeholder="Phone Number *"
                    value={phone}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <div className='flex items-center mt-5'>
                  <div className="block-input">
                    
                    <Icon.CheckSquare size={20} weight='fill' className='icon-checkbox' />
                  </div>
                  <label htmlFor='remember' className="pl-2 cursor-pointer text-secondary2">
                    I agree to the
                    <Link href={'#!'} className='text-black hover:underline pl-1'>Terms of User</Link>
                  </label>
                </div>
                <div className="block-button md:mt-7 mt-4">
                  <button className="button-main bg-black text-white px-4 py-2 rounded-md">Register</button>
                </div>
                
                {error && (
                  <div className="mt-4 text-center text-sm text-red-600">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mt-4 text-center text-sm text-green-600">
                    {success}
                  </div>
                )}
              </form>
            </div>
            <div className="right md:w-1/2 w-full lg:pl-[60px] md:pl-[40px] flex items-center">
              <div className="text-content">
                <div className="heading4">Already have an account?</div>
                <div className="mt-2 text-secondary">
                  Welcome back. Sign in to access your personalized experience, saved preferences, and more. We're thrilled to have you with us again!
                </div>
                <div className="block-button md:mt-7 mt-4">
                  <Link href={'/login'} className="button-main bg-black text-white px-4 py-2 rounded-md">Login</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
     </>
  );
};

export default RegisterForm;
