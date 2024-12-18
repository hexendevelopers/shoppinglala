"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../Components/Header';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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

    try {
      const response = await fetch('/api/shopify/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.message || 'Failed to process request');
        return;
      }

      setSuccessMessage('Password reset instructions have been sent to your email');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push('/Pages/loginpage');
      }, 3000);

    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <div className="forgot-password-block md:py-20 py-10 text-black">
      <Header />
      <div className="container">
        <div className="content-main max-w-md mx-auto">
          <div className="heading4 text-center">Forgot Password</div>
          <p className="text-secondary text-center mt-2">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
          
          <form className="md:mt-7 mt-4" onSubmit={handleSubmit}>
            <div className="email">
              <input 
                className="border-line px-4 pt-3 pb-3 w-full rounded-lg" 
                id="email" 
                type="email" 
                placeholder="Email address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
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
              <button type="submit" className="w-full bg-black text-white px-4 py-2 rounded-md">
                Reset Password
              </button>
            </div>

            <div className="text-center mt-4">
              <Link href="/Pages/loginpage" className="text-black hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 