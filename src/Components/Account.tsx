"use client";

import React, { useState, useEffect } from "react";
import { AiOutlineUser } from "react-icons/ai";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Account = ({ cartValue = 0 }) => {
  const [cartItemsCount, setCartItemsCount] = useState(cartValue);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartItemsCount(savedCart.length);
    }
  }, []);

  const handleOpenPopup = () => {
    if (typeof window !== "undefined") {
      try {
        const accessToken = localStorage.getItem("useraccessToken");

        if (!accessToken) {
          setIsPopupOpen(true);
          return false;
        }
        router.push("/Pages/Myaccount"); // Use the exact path based on the App Router structure.
        return true;
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsPopupOpen(true);
        return false;
      }
    }
    return false;
  };

  const handleClosePopup = () => setIsPopupOpen(false);

  return (
    <div>
      <div className="flex justify-between items-center bg-white shadow-md p-4">
        <div className="flex items-center gap-6">
          <AiOutlineUser
            className="text-2xl text-black cursor-pointer"
            title="My Account"
            onClick={handleOpenPopup}
          />
        </div>
      </div>
      {isPopupOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-80 shadow-lg relative">
            <h2 className="text-xl font-semibold mb-4">Welcome Back!</h2>
            <p className="mb-4">Don't have an account?</p>
            <Link href="/Pages/loginpage">
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded-md w-full mb-3"
                onClick={handleClosePopup}
              >
                Login
              </button>
            </Link>
            <p className="text-center mb-4">or</p>
            <Link href="/Pages/Registerpage">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-md w-full"
                onClick={handleClosePopup}
              >
                Register
              </button>
            </Link>
            <button
              className="absolute top-2 right-2 text-gray-600"
              onClick={handleClosePopup}
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account;
