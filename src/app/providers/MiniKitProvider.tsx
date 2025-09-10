"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { AuthProvider } from "../contexts/AuthContext";

declare global {
  interface Window {
    MiniKit: typeof MiniKit;
  }
}

interface MiniKitContextType {
  isInstalled: boolean;
  isInitialized: boolean;
}

const MiniKitContext = createContext<MiniKitContextType>({
  isInstalled: false,
  isInitialized: false,
});

export const useMiniKit = () => useContext(MiniKitContext);

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const initializeMiniKit = async () => {
      try {
        // Install MiniKit
        if (typeof MiniKit.install === "function") {
          MiniKit.install();
        }

        // Make MiniKit available globally
        window.MiniKit = MiniKit;

        // Check if MiniKit is installed (running in World App)
        const installed = MiniKit.isInstalled();
        setIsInstalled(installed);

        if (installed) {
          console.log("MiniKit is installed and ready - running in World App");
        } else {
          console.log("MiniKit not installed - running outside World App (desktop/browser)");
        }

        setIsInitialized(true);
        console.log("MiniKit provider initialized successfully");
      } catch (error) {
        console.warn("MiniKit initialization error (expected when not in World App):", error);
        // Still initialize even if there's an error - this is expected when not in World App
        setIsInstalled(false);
        setIsInitialized(true);
      }
    };

    initializeMiniKit();
  }, []);

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <MiniKitContext.Provider value={{ isInstalled, isInitialized }}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MiniKitContext.Provider>
  );
}
