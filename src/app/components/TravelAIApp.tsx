'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { Camera, MapPin, LogOut, Download, Share2, ArrowLeft, X, CreditCard, Sparkles } from 'lucide-react';
import { FaUser } from 'react-icons/fa';
import { processImageFile } from '../utils/imageUtils';
import { MiniKit, ResponseEvent, tokenToDecimals, Tokens, PayCommandInput, MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js';

const LOCATIONS = [
  { id: 'france', name: 'France', flag: '🇫🇷', description: 'Eiffel Tower, Paris' },
  { id: 'usa', name: 'USA', flag: '🇺🇸', description: 'Statue of Liberty, New York' },
  { id: 'uk', name: 'UK', flag: '🇬🇧', description: 'Big Ben, London' },
  { id: 'italy', name: 'Italy', flag: '🇮🇹', description: 'Colosseum, Rome' },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', description: 'Tokyo Skyline' },
  { id: 'india', name: 'India', flag: '🇮🇳', description: 'Taj Mahal, Agra' },
  { id: 'australia', name: 'Australia', flag: '🇦🇺', description: 'Sydney Opera House' },
  { id: 'brazil', name: 'Brazil', flag: '🇧🇷', description: 'Christ the Redeemer, Rio' },
  { id: 'dubai', name: 'Dubai', flag: '🇦🇪', description: 'Burj Khalifa, Dubai' },
];

const LOADING_MESSAGES = [
  "Validating that the uploaded image contains a person...",
  "Analyzing your photo for optimal placement...",
  "Preparing AI model for image generation...",
  "Creating your travel photo with advanced AI...",
  "Enhancing details and adjusting lighting...",
  "Finalizing your personalized travel image...",
  "Almost ready! Adding finishing touches...",
];

export default function TravelAIApp() {
  const { user, logout } = useAuth();
  const [, setSelectedFile] = useState<File | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('france');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImageData, setProcessedImageData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'location' | 'payment' | 'result'>('upload');
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Payment-related state
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Rotate loading messages every 2 seconds during generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setLoadingMessageIndex(0);
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  // Listen for share events
  useEffect(() => {
    MiniKit.subscribe(ResponseEvent.MiniAppShare, (payload) => {
      // Handle share response based on the documentation
      if (payload && 'status' in payload) {
        if (payload.status === 'success') {
          console.log('Share completed successfully');
        } else if (payload.status === 'error') {
          console.log('Share failed:', 'error' in payload ? payload.error : 'Unknown error');
        }
      } else {
        // iOS web share sheet has no response
        console.log('Share action completed (iOS web share)');
      }
    });

    // Global error handler to catch any unhandled abort errors
    const handleUnhandledError = (event: ErrorEvent) => {
      if (event.error && 
          event.error.name === 'AbortError' && 
          event.error.message.includes('cancellation of share')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleUnhandledError);
    
    return () => {
      window.removeEventListener('error', handleUnhandledError);
    };
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    
    try {
      // Process the image (resize, format, validate)
      const processed = await processImageFile(file);
      
      setSelectedFile(processed.file);
      setPreviewUrl(processed.dataUrl);
      setProcessedImageData(processed.dataUrl);
      setCurrentStep('location');
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
      setError(errorMessage);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setCurrentStep('payment');
  };

  const handleGenerate = useCallback(async (paymentRef?: string) => {
    const refToUse = paymentRef || paymentReference;
    console.log('handleGenerate called with:', { 
      hasProcessedImageData: !!processedImageData, 
      paymentReference: refToUse 
    });
    
    if (!processedImageData || !refToUse) {
      console.log('handleGenerate early return - missing data');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageDataUrl: processedImageData,
          location: selectedLocation,
          paymentReference: refToUse,
          userIdentifier: user?.username || user?.walletAddress || 'anonymous',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to generate image';
        setError(errorMessage);
        return;
      }

      // Store both the data URL for immediate display and the R2 URL for download
      setGeneratedImage(data.imageDataUrl); // Always use data URL for immediate display
      setGeneratedImageUrl(data.imageUrl); // R2 URL for download/share
      // Clear payment reference immediately after successful generation
      setPaymentReference(null);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Uploaded image is not of a person')) {
        console.error('Error generating image:', error);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      setError(errorMessage);
      // Clear payment reference on error too to prevent reuse
      setPaymentReference(null);
    } finally {
      setIsGenerating(false);
    }
  }, [processedImageData, paymentReference, selectedLocation, user?.username, user?.walletAddress]);

  const handlePayment = useCallback(async () => {
    try {
      setIsPaying(true);
      setPaymentError(null);

      if (!MiniKit.isInstalled()) {
        setPaymentError("Please open this app in World App to make payment.");
        return;
      }

      // 1) Create a backend-issued reference for this payment
      const initRes = await fetch("/api/initiate-payment", { 
        method: "POST", 
        credentials: "include" 
      });
      if (!initRes.ok) {
        const msg = await initRes.text().catch(() => null);
        setPaymentError(msg || "Unable to initiate payment. Please try again.");
        return;
      }
      const { id } = await initRes.json();

      // 2) Build the Pay payload
      const payload: PayCommandInput = {
        reference: id,
        to: process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS || "0xDd2a0c0EA69A77a99779f611A5cB97c63b215124",
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(0.5, Tokens.WLD).toString(),
          },
        ],
        description: "Travel AI - Generate personalized travel photo",
      };

      // 3) Execute payment in World App
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);

      // Handle different payment statuses
      if (finalPayload.status == 'success') {
        // 4) Confirm payment on backend
        const confirmRes = await fetch("/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            payload: finalPayload as MiniAppPaymentSuccessPayload 
          }),
          credentials: "include",
        });
        const confirm = await confirmRes.json().catch(() => ({}));
        if (confirmRes.ok && confirm?.success) {
          // Payment successful, store reference and proceed to generate
          setPaymentReference(id);
          setCurrentStep('result');
          // Automatically start generation with the payment reference
          console.log('Starting image generation with payment reference:', id);
          handleGenerate(id);
          return;
        }
        const serverErr = confirm?.error || (await confirmRes.text().catch(() => ""));
        if (serverErr) {
          setPaymentError(`Payment verification failed: ${serverErr}`);
          return;
        }
      } else {
        // Handle non-success responses
        const response = finalPayload as { status?: string; error?: string };
        if (response.status === 'error') {
          const errorMsg = response.error || 'Payment failed in World App';
          setPaymentError(`Payment error: ${errorMsg}`);
          return;
        } else if (response.status === 'cancelled') {
          setPaymentError("Payment was cancelled. Please try again.");
          return;
        }
      }

      setPaymentError("Payment not completed. Please try again.");
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsPaying(false);
    }
  }, [handleGenerate]);

  const resetFlow = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedImageData(null);
    setGeneratedImage(null);
    setGeneratedImageUrl(null);
    setError(null);
    setCurrentStep('upload');
    setPaymentError(null);
    setPaymentReference(null); // Clear payment reference on reset
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    
    // Open the R2 URL in a new tab for download
    window.open(generatedImageUrl, '_blank');
  };

  const handleShare = async () => {
    if (!generatedImage) return;
    
    // Check if MiniKit is available
    if (!MiniKit.isInstalled()) {
      console.warn('MiniKit not available, falling back to native share');
      // Fallback to native Web Share API if available
      if (navigator.share) {
        try {
          // Convert data URL to blob and file
          const response = await fetch(generatedImage);
          const blob = await response.blob();
          const file = new File([blob], `travel-photo-${selectedLocationData?.name.toLowerCase()}.jpg`, { type: 'image/jpeg' });
          
          await navigator.share({
            files: [file],
            title: 'My AI Travel Photo',
            text: `Just check out my travel picture from Travel AI on World mini store! ✈️`
          });
        } catch (error) {
          // Silently handle cancellation and unsupported errors
          if (error instanceof Error && 
              (error.name === 'AbortError' || 
               error.message.includes('cancellation') ||
               error.message.includes('not supported'))) {
            return;
          }
          console.warn('Native share encountered an issue:', error);
        }
      } else {
        console.warn('Share not supported on this device');
      }
      return;
    }
    
    try {
      // Convert data URL to blob and file for World Mini App share
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], `travel-photo-${selectedLocationData?.name.toLowerCase()}.jpg`, { type: 'image/jpeg' });
      
      await MiniKit.commandsAsync.share({
        files: [file],
        title: 'My AI Travel Photo',
        text: `Just check out my travel picture from Travel AI on World mini store! ✈️`
      });
    } catch (error) {
      // Silently handle all share-related errors to prevent console spam
      if (error instanceof Error) {
        if (error.name === 'AbortError' || 
            error.message.includes('cancellation of share') ||
            error.message.includes('Abort due to cancellation')) {
          // User cancelled the share dialog - this is normal behavior, don't log
          return;
        }
        
        if (error.message.includes('not supported') || 
            error.message.includes('not available')) {
          // Share not supported - don't log as error
          return;
        }
      }
      
      // Only log unexpected errors
      console.warn('Share encountered an issue:', error);
    }
  };

  const selectedLocationData = LOCATIONS.find(loc => loc.id === selectedLocation);

  // Helper function to format error messages for better UX
  const formatErrorMessage = (error: string) => {
    if (error.includes('Image size must be less than 10MB')) {
      return {
        title: 'Image Too Large',
        message: 'Please use a smaller image (under 10MB).',
        type: 'size'
      };
    }
    if (error.includes('not of a person')) {
      return {
        title: 'No Person Found',
        message: 'Please upload a clear photo of yourself.',
        type: 'person'
      };
    }
    if (error.includes('Invalid image file')) {
      return {
        title: 'Invalid Image',
        message: 'Please use JPG, PNG, GIF, or WebP format.',
        type: 'format'
      };
    }
    if (error.includes('Failed to process image')) {
      return {
        title: 'Processing Failed',
        message: 'Please try a different photo.',
        type: 'processing'
      };
    }
    if (error.includes('Payment required') || error.includes('Invalid or expired payment reference')) {
      return {
        title: 'Payment Required',
        message: 'Please complete payment to continue.',
        type: 'payment'
      };
    }
    if (error.includes('Server configuration error') || error.includes('GEMINI_API_KEY')) {
      return {
        title: 'Service Unavailable',
        message: 'Please try again in a few minutes.',
        type: 'server'
      };
    }
    // Default error
    return {
      title: 'Generation Failed',
      message: 'Please try again.',
      type: 'general'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hidden on result page */}
      {currentStep !== 'result' && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-lg font-semibold text-gray-900">Travel AI</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <FaUser className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.username || user?.walletAddress?.slice(0, 6) + '...' + user?.walletAddress?.slice(-4)}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Progress Steps - Hidden on result page */}
      {currentStep !== 'result' && (
        <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto flex items-center justify-center space-x-2 sm:space-x-4">
          {[
            { id: 'upload', label: 'Photo', icon: Camera },
            { id: 'location', label: 'Location', icon: MapPin },
            { id: 'payment', label: 'Generate', icon: Sparkles },
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = ['upload', 'location', 'payment'].indexOf(currentStep) > index;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive ? 'bg-gray-900 text-white' : 
                  isCompleted ? 'bg-green-500 text-white' : 
                  'bg-gray-200 text-gray-500'
                }`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                {index < 2 && (
                  <div className={`w-4 sm:w-8 h-0.5 mx-1 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Back Button - Better positioned */}
      {currentStep !== 'upload' && currentStep !== 'result' && (
        <div className="px-4 py-2 bg-white border-b border-gray-200">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => {
                if (currentStep === 'location') setCurrentStep('upload');
                else if (currentStep === 'payment') setCurrentStep('location');
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] px-2 -ml-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 py-2">
        {currentStep === 'upload' && (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Photo</h2>
              <p className="text-gray-600">Upload a clear selfie or full-body photo for best results</p>
            </div>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:border-gray-400 active:border-gray-500 transition-colors bg-white min-h-[200px] flex items-center justify-center"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium text-base sm:text-lg">Tap to upload</p>
                  <p className="text-sm text-gray-500 mt-1 px-4">JPG, PNG up to 10MB • Clear face visible</p>
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                {(() => {
                  const errorInfo = formatErrorMessage(error);
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">!</span>
                      </div>
                      <div>
                        <p className="font-medium text-red-800 text-sm">{errorInfo.title}</p>
                        <p className="text-red-600 text-xs">{errorInfo.message}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {currentStep === 'location' && (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Destination</h2>
              <p className="text-gray-600">Where do you want to travel?</p>
            </div>
            
            <div className="space-y-3">
              {LOCATIONS.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left min-h-[60px] active:scale-[0.98] ${
                    selectedLocation === location.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl sm:text-4xl flex-shrink-0">{location.flag}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-base ${
                        selectedLocation === location.id ? 'text-white' : 'text-gray-900'
                      }`}>{location.name}</div>
                      <div className={`text-sm ${
                        selectedLocation === location.id ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {location.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'payment' && (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate AI Image</h2>
              <p className="text-gray-600">Pay 0.5 WLD to create your travel photo</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Image
                  src={previewUrl || ''}
                  alt="Preview"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded-xl"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Your Photo</div>
                  <div className="text-sm text-gray-500">Ready for AI processing</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-2xl">{selectedLocationData?.flag}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{selectedLocationData?.name}</div>
                  <div className="text-sm text-gray-500">{selectedLocationData?.description}</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">Secure Payment</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-900">0.5 WLD</div>
                  <div className="text-xs text-blue-600">per image</div>
                </div>
              </div>
            </div>

            
            <button
              onClick={handlePayment}
              disabled={isPaying}
              className="w-full bg-gray-900 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 min-h-[56px] active:scale-[0.98]"
            >
              {isPaying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing Payment...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate AI Image
                </>
              )}
            </button>

            {paymentError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {paymentError}
              </div>
            )}
          </div>
        )}


        {currentStep === 'result' && (
          <div className="max-w-sm mx-auto min-h-screen flex flex-col justify-start pt-2 sm:pt-4 -mb-1.5">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                {/* Enhanced Loading Spinner with Animation */}
                <div className="relative mb-8">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-r from-blue-500/20 to-teal-500/20 animate-pulse"></div>
                  
                  {/* Main spinner container */}
                  <div className="relative w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-gray-100">
                    {/* Primary spinner */}
                    <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                    
                    {/* Inner accent */}
                    <div className="absolute w-6 h-6 border-2 border-gray-100 border-t-teal-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  </div>
                  
                  {/* Floating dots animation */}
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                  <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                </div>
                
                {/* Title with subtle animation */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3 animate-pulse">Generating...</h3>
                
                {/* Loading message with fade transition */}
                <div className="text-center max-w-sm">
                  <p className="text-gray-600 text-base leading-relaxed transition-all duration-500 ease-in-out">
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </p>
                  
                  {/* Progress indicator dots */}
                  <div className="flex justify-center mt-4 space-x-2">
                    {LOADING_MESSAGES.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === loadingMessageIndex 
                            ? 'bg-blue-500 scale-125' 
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 text-red-600">⚠️</div>
                </div>
                {(() => {
                  const errorInfo = formatErrorMessage(error);
                  return (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{errorInfo.title}</h3>
                        <p className="text-gray-600 mb-4">{errorInfo.message}</p>
                      </div>
                      <div className="space-y-3">
                        <button
                          onClick={resetFlow}
                          className="w-full bg-gray-900 text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
                        >
                          {errorInfo.type === 'size' || errorInfo.type === 'format' || errorInfo.type === 'processing' 
                            ? 'Try Different Photo' 
                            : 'Upload New Photo'}
                        </button>
                        {errorInfo.type === 'server' && (
                          <button
                            onClick={() => {
                              setError(null);
                              setCurrentStep('payment');
                            }}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-2xl font-medium hover:bg-blue-700 transition-colors"
                          >
                            Try Again
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : generatedImage ? (
              <div className="space-y-4">
                <div className="text-center relative">
                  <button
                    onClick={resetFlow}
                    className="absolute top-0 right-0 p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Travel Photo</h3>
                  <p className="text-gray-600">Here&apos;s your AI-generated image in {selectedLocationData?.name}</p>
                </div>
                
                <div className="relative bg-white rounded-2xl overflow-hidden">
                  <Image
                    src={generatedImage}
                    alt="Generated"
                    width={400}
                    height={600}
                    className="w-full"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full text-sm font-medium text-gray-900 flex items-center gap-2">
                    <span>{selectedLocationData?.flag}</span>
                    <span>{selectedLocationData?.name}</span>
                  </div>
                </div>
                
                {/* Primary CTA - Create Another Photo */}
                <button
                  onClick={resetFlow}
                  className="w-full bg-gray-900 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-800 active:bg-gray-700 transition-colors min-h-[56px] active:scale-[0.98] mb-4"
                >
                  Create Another Photo
                </button>
                
                {/* Secondary Actions */}
                <div className="flex gap-3">
                  <button 
                    onClick={handleDownload}
                    disabled={!generatedImageUrl}
                    className="flex-1 bg-blue-50 text-blue-700 py-3 px-4 rounded-2xl font-medium hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98] border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!generatedImageUrl ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleShare}
                    disabled={!generatedImage}
                    className="flex-1 bg-teal-50 text-teal-700 py-3 px-4 rounded-2xl font-medium hover:bg-teal-100 active:bg-teal-200 transition-colors flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98] border border-teal-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!generatedImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Share
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
