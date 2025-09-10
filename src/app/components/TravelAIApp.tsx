'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { Camera, MapPin, LogOut, Sparkles, Download, Share2, ArrowLeft } from 'lucide-react';
import { FaUser } from 'react-icons/fa';
import { processImageFile } from '../utils/imageUtils';

const LOCATIONS = [
  { id: 'france', name: 'France', flag: '🇫🇷', description: 'Eiffel Tower, Paris' },
  { id: 'switzerland', name: 'Switzerland', flag: '🇨🇭', description: 'Alpine mountains' },
  { id: 'usa', name: 'USA', flag: '🇺🇸', description: 'Statue of Liberty, New York' },
  { id: 'italy', name: 'Italy', flag: '🇮🇹', description: 'Colosseum, Rome' },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', description: 'Fushimi Inari-taisha Shrine, Kyoto' },
  { id: 'egypt', name: 'Egypt', flag: '🇪🇬', description: 'Pyramids, Giza' },
  { id: 'uk', name: 'UK', flag: '🇬🇧', description: 'Big Ben, London' },
  { id: 'india', name: 'India', flag: '🇮🇳', description: 'Taj Mahal, Agra' },
  { id: 'thailand', name: 'Thailand', flag: '🇹🇭', description: 'Bangkok temples' },
];

export default function TravelAIApp() {
  const { user, logout } = useAuth();
  const [, setSelectedFile] = useState<File | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('france');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImageData, setProcessedImageData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'location' | 'generate' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setCurrentStep('generate');
  };

  const handleGenerate = async () => {
    if (!processedImageData) return;

    setIsGenerating(true);
    setError(null);
    setCurrentStep('result');
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageDataUrl: processedImageData,
          location: selectedLocation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases gracefully
        const errorMessage = data.error || 'Failed to generate image';
        
        // Don't throw the error, just set it in state
        setError(errorMessage);
        return;
      }

      setGeneratedImage(data.imageDataUrl);
    } catch (error) {
      // Only log network/parsing errors, not validation errors
      if (error instanceof Error && !error.message.includes('Uploaded image is not of a person')) {
        console.error('Error generating image:', error);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetFlow = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedImageData(null);
    setGeneratedImage(null);
    setError(null);
    setCurrentStep('upload');
  };

  const selectedLocationData = LOCATIONS.find(loc => loc.id === selectedLocation);

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-inset">
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
                {user?.username}
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

      {/* Progress Steps */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 safe-area-inset">
        <div className="max-w-md mx-auto flex items-center justify-center space-x-2 sm:space-x-4">
          {[
            { id: 'upload', label: 'Photo', icon: Camera },
            { id: 'location', label: 'Location', icon: MapPin },
            { id: 'generate', label: 'Generate', icon: Sparkles },
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = ['upload', 'location', 'generate'].indexOf(currentStep) > index;
            
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
                  <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Back Button - Better positioned */}
      {currentStep !== 'upload' && currentStep !== 'result' && (
        <div className="px-4 py-2 bg-white border-b border-gray-200 safe-area-inset">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => {
                if (currentStep === 'location') setCurrentStep('upload');
                else if (currentStep === 'generate') setCurrentStep('location');
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
      <main className="px-4 py-6">
        {currentStep === 'upload' && (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Photo</h2>
              <p className="text-gray-600">Full body image of a person is required</p>
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
                  <p className="text-sm text-gray-500 mt-1 px-4">JPG, PNG up to 10MB • Person required</p>
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
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {currentStep === 'location' && (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-8">
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

        {currentStep === 'generate' && (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate</h2>
              <p className="text-gray-600">Your photo will be placed in {selectedLocationData?.name}</p>
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
            
            <button
              onClick={handleGenerate}
              disabled={!processedImageData}
              className="w-full bg-gray-900 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3 min-h-[56px] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5" />
              Generate AI Image
            </button>
          </div>
        )}

        {currentStep === 'result' && (
          <div className="max-w-sm mx-auto">
            {isGenerating ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating...</h3>
                <p className="text-gray-600">Creating your travel photo with AI</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 text-red-600">⚠️</div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Generation Failed</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="space-y-3">
                  <button
                    onClick={resetFlow}
                    className="w-full bg-gray-900 text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
                  >
                    Upload New Photo
                  </button>
                  {error.includes('not of a person') && (
                    <p className="text-sm text-gray-500">
                      Make sure your photo clearly shows your face and body
                    </p>
                  )}
                </div>
              </div>
            ) : generatedImage ? (
              <div className="space-y-6">
                <div className="text-center">
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
                
                <div className="flex gap-3">
                  <button className="flex-1 bg-gray-100 text-gray-900 py-3 px-4 rounded-2xl font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98]">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-2xl font-medium hover:bg-gray-800 active:bg-gray-700 transition-colors flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98]">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
                
                <button
                  onClick={resetFlow}
                  className="w-full bg-gray-200 text-gray-900 py-3 px-4 rounded-2xl font-medium hover:bg-gray-300 active:bg-gray-400 transition-colors min-h-[48px] active:scale-[0.98]"
                >
                  Create Another Photo
                </button>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
