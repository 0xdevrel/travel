'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 sm:px-0">
        <div className="w-full max-w-md mx-auto">
          <header className="bg-black text-white py-3 px-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </Link>
              <h1 className="text-lg font-semibold">Privacy Policy</h1>
              <div className="w-16"></div> {/* Spacer for centering */}
            </div>
          </header>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy Policy</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Image Processing</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Only upload images you want to share. We use AI services powered by Gemini AI to generate your travel photos.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Processing</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Your images are processed by Google servers through Gemini AI. We do not store your images permanently on our servers.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Collection</h3>
                <p className="text-sm text-gray-700 mb-4">
                  We collect minimal data necessary for the service to function, including your wallet address for authentication and payment processing.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact</h3>
                <p className="text-sm text-gray-700 mb-4">
                  For any privacy concerns or questions, please contact us at:
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  introvertmac@gmail.com
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Changes to Privacy Policy</h3>
                <p className="text-sm text-gray-700">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
