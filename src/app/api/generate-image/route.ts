import { NextRequest, NextResponse } from 'next/server';
import { generateTravelImage } from '../../services/geminiService';
import { hasPaymentReference, markPaymentReferenceUsed, cleanupExpiredReferences } from '../_paymentStore';

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, location, paymentReference } = await request.json();

    if (!imageDataUrl || !location) {
      return NextResponse.json(
        { error: 'Missing required parameters: imageDataUrl and location' },
        { status: 400 }
      );
    }

    if (!paymentReference) {
      return NextResponse.json(
        { error: 'Payment required. Please complete payment before generating image.' },
        { status: 402 }
      );
    }

    // Validate payment reference format (should be a UUID without dashes)
    if (!/^[a-f0-9]{32}$/i.test(paymentReference)) {
      return NextResponse.json(
        { error: 'Invalid payment reference format.' },
        { status: 400 }
      );
    }

    // Validate location
    const validLocations = ['france', 'usa', 'uk', 'italy', 'japan', 'india', 'australia', 'brazil', 'dubai'];
    if (!validLocations.includes(location)) {
      return NextResponse.json(
        { error: 'Invalid location selected' },
        { status: 400 }
      );
    }

    // Clean up expired references first
    cleanupExpiredReferences();

    // Verify payment reference exists and is valid (one-time use)
    if (!hasPaymentReference(paymentReference)) {
      return NextResponse.json(
        { error: 'Invalid, expired, or already used payment reference. Please complete payment again.' },
        { status: 402 }
      );
    }

    // Mark the payment reference as used immediately (one-time use)
    // This ensures each image generation requires a fresh payment
    markPaymentReferenceUsed(paymentReference);
    
    console.log(`Payment reference ${paymentReference} consumed for image generation`);

    // Generate the travel image using Gemini AI
    const generatedImageDataUrl = await generateTravelImage(imageDataUrl, location);

    return NextResponse.json({
      success: true,
      imageDataUrl: generatedImageDataUrl
    });

  } catch (error) {
    console.error('Error generating travel image:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Handle specific error cases
    if (errorMessage.includes('Uploaded image is not of a person')) {
      return NextResponse.json(
        { error: 'Uploaded image is not of a person. Please upload a clear photo of yourself.' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('Invalid image data URL format')) {
      return NextResponse.json(
        { error: 'Invalid image format. Please upload a valid image file.' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('GEMINI_API_KEY environment variable is not set')) {
      return NextResponse.json(
        { error: 'Server configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Failed to generate travel image. Please try again.' },
      { status: 500 }
    );
  }
}
