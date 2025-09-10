import { NextRequest, NextResponse } from 'next/server';
import { generateTravelImage } from '../../services/geminiService';

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, location } = await request.json();

    if (!imageDataUrl || !location) {
      return NextResponse.json(
        { error: 'Missing required parameters: imageDataUrl and location' },
        { status: 400 }
      );
    }

    // Validate location
    const validLocations = ['france', 'switzerland', 'usa', 'italy', 'japan', 'egypt', 'uk', 'india', 'thailand'];
    if (!validLocations.includes(location)) {
      return NextResponse.json(
        { error: 'Invalid location selected' },
        { status: 400 }
      );
    }

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
