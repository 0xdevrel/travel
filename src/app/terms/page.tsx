'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
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
              <h1 className="text-lg font-semibold">Terms of Service</h1>
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Terms of Service</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Description</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Travel AI is a service that uses artificial intelligence to generate travel photos by placing your image in various iconic locations around the world.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">User Responsibilities</h3>
                <p className="text-sm text-gray-700 mb-4">
                  • Only upload images you own or have permission to use<br/>
                  • Only upload images you want to share<br/>
                  • Ensure uploaded images contain a clear person<br/>
                  • Do not upload inappropriate or offensive content
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Processing</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Our service uses Gemini AI powered by Google to process your images. By using our service, you agree to Google&apos;s terms of service for AI processing.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Each generated image costs 0.5 WLD. Payment is processed through World ID authentication. All sales are final.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Limitation of Liability</h3>
                <p className="text-sm text-gray-700 mb-4">
                  We are not responsible for the quality or accuracy of AI-generated images. The service is provided &quot;as is&quot; without warranties of any kind.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact</h3>
                <p className="text-sm text-gray-700 mb-4">
                  For any questions or concerns, please contact us at:
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  introvertmac@gmail.com
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Changes to Terms</h3>
                <p className="text-sm text-gray-700">
                  We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of any changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
