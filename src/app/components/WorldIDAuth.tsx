'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Shield } from 'lucide-react';
import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

export default function LandingPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletAuth = async () => {
    if (!MiniKit.isInstalled()) {
      setError("Please open this app in World App");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Get nonce from backend
      const res = await fetch(`/api/nonce`);
      if (!res.ok) {
        throw new Error("Failed to get nonce");
      }
      const { nonce } = await res.json();

      // 2. Trigger wallet authentication
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
        requestId: 'travel-ai-auth', // Optional
        expirationTime: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notBefore: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // 1 day ago
        statement: 'Sign in to Travel AI - Generate AI images of yourself in different locations around the world',
      });

      if (finalPayload.status === 'error') {
        setError("Authentication failed. Please try again.");
        return;
      }

      // 3. Verify the signature on backend
      const response = await fetch('/api/complete-siwe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload as MiniAppWalletAuthSuccessPayload,
          nonce,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.status === "success" && result.isValid) {
        // 4. Get user info from the payload
        const walletAddress = (finalPayload as MiniAppWalletAuthSuccessPayload).address;
        
        // Try to get username from MiniKit if available
        let username: string | undefined;
        try {
          if (MiniKit.isInstalled()) {
            const userInfo = await MiniKit.getUserByAddress(walletAddress);
            username = userInfo?.username;
          }
        } catch (error) {
          console.warn('Could not fetch username:', error);
        }
        
        const userData = {
          walletAddress: walletAddress,
          username: username,
        };
        
        // Update auth context
        login(userData);
      } else {
        setError(result.message || "Authentication verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Wallet auth error:", error);
      setError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white safe-area-inset">
      {/* Header */}
      <div className="px-4 py-3 safe-area-inset sm:px-0">
        <div className="w-full max-w-md mx-auto">
          <header className="bg-black text-white py-3 px-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                  <Camera className="w-4 h-4 text-black" />
                </div>
                <h1 className="text-lg font-semibold">Travel AI</h1>
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* App Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Camera className="w-10 h-10 text-white" />
            </div>
            
            {/* App Name */}
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              Travel AI
            </h1>
            
            {/* Tagline */}
            <p className="text-gray-600 text-center mb-8">
              Upload your photo and see yourself in amazing places around the world
            </p>

            {/* How it works */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">How it works</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm">Upload a clear photo of a person (full body recommended)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm">Choose from 9 amazing destinations</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm">Get your AI-generated travel photo</span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-8 bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Pricing</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Per image</span>
                  <span className="text-sm font-medium text-gray-900">0.5 WLD each</span>
                </div>
              </div>
            </div>

          {/* CTA Button */}
          <button
            onClick={handleWalletAuth}
            disabled={isLoading}
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 min-h-[56px] active:scale-[0.98]"
          >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating with Wallet...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Sign in with Wallet
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm">
              Made with <span role="img" aria-label="love">❤️</span> by{' '}
              <a
                href="https://www.ibrlc.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-medium underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                tabIndex={0}
              >
                IBRL Labs
              </a>
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Wallet authentication required • Built for World Mini Apps
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
