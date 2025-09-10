'use client';

import { useAuth } from './contexts/AuthContext';
import LandingPage from './components/WorldIDAuth';
import TravelAIApp from './components/TravelAIApp';

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <TravelAIApp /> : <LandingPage />;
}
