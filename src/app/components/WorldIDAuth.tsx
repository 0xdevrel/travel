'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Shield } from 'lucide-react';
import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import Link from 'next/link';
import Image from 'next/image';

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
        
        // Get username from MiniKit user object after successful auth
        let username: string | undefined;
        try {
          if (MiniKit.isInstalled()) {
            // Wait a bit for MiniKit to be fully initialized
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (MiniKit.user?.username) {
              username = MiniKit.user.username;
            } else {
              // Fallback: try to get user by address
              const userInfo = await MiniKit.getUserByAddress(walletAddress);
              username = userInfo?.username;
            }
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
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-4 py-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* App Icon */}
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Travel AI Logo"
                width={100}
                height={100}
                className="w-20 h-20 rounded-2xl object-cover"
                priority
              />
            </div>
            
            {/* App Name */}
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              Travel AI
            </h1>
            
            {/* Tagline */}
            <p className="text-gray-600 text-center mb-6">
              Transform your pictures into travel photos ✨
            </p>

            {/* How it works */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">How it works</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm">Upload a clear selfie or full-body photo</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm">Pick from iconic destinations worldwide</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm">Personalized travel photo in seconds</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 text-sm">Only 0.5 WLD per image</span>
                </div>
              </div>
            </div>

            {/* Preview Examples */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">See yourself in:</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-2xl mb-1">🇫🇷</div>
                  <div className="text-xs text-gray-600">Paris</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🇺🇸</div>
                  <div className="text-xs text-gray-600">New York</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🇯🇵</div>
                  <div className="text-xs text-gray-600">Tokyo</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🇬🇧</div>
                  <div className="text-xs text-gray-600">London</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🇮🇹</div>
                  <div className="text-xs text-gray-600">Rome</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🇦🇺</div>
                  <div className="text-xs text-gray-600">Sydney</div>
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
                  Authenticating
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
                className="text-blue-500 hover:text-teal-500 transition-colors"
              >
                IBRL Labs
              </a>
            </p>
            <p>
              <Link
                href="/privacy"
                className="text-blue-400 text-xs hover:text-blue-500 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-300 text-xs">•</span>
              <Link
                href="/terms"
                className="text-teal-400 text-xs hover:text-teal-500 transition-colors"
              >
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
