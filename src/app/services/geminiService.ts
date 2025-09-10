/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

// Only throw error at runtime, not during build
if (!API_KEY && typeof window === 'undefined') {
  console.warn("GEMINI_API_KEY environment variable is not set");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Location-specific prompts for different destinations
const LOCATION_PROMPTS = {
  france: "Use the image of person in this photo to keep the face as it. Place this person in front of the Eiffel Tower in Paris, France. The person should be standing naturally in front of this iconic landmark with the Parisian architecture visible in the background.",
  usa: "Use the image of person in this photo to keep the face as it. Place this person in front of the Statue of Liberty in New York Harbor, USA. The person should be standing with the iconic statue visible in the background and the New York skyline.",
  uk: "Use the image of person in this photo to keep the face as it. Place this person in front of Big Ben and the Houses of Parliament in London, UK. The person should be standing with this iconic London landmark visible in the background.",
  italy: "Use the image of person in this photo to keep the face as it. Place this person in front of the Colosseum in Rome, Italy. The person should be standing with the ancient Roman amphitheater visible in the background.",
  japan: "Use the image of person in this photo to keep the face as it. Place this person in front of the Tokyo Skyline with the Tokyo Tower visible in the background. The person should be standing in a modern urban setting with the iconic Tokyo cityscape.",
  india: "Use the image of person in this photo to keep the face as it. Place this person in front of the Taj Mahal in Agra, India. The person should be standing with this beautiful white marble mausoleum visible in the background.",
  australia: "Use the image of person in this photo to keep the face as it. Place this person in front of the Sydney Opera House in Sydney, Australia. The person should be standing with the iconic white sail-like architecture visible in the background and the Sydney Harbour Bridge.",
  brazil: "Use the image of person in this photo to keep the face as it. Place this person in front of the Christ the Redeemer statue in Rio de Janeiro, Brazil. The person should be standing with the iconic statue visible in the background and the city of Rio below.",
  dubai: "Use the image of person in this photo to keep the face as it. Place this person in front of the Burj Khalifa in Dubai, UAE. The person should be standing with the world's tallest building visible in the background and the modern Dubai skyline."
};

/**
 * Creates a fallback prompt for when the primary prompt is blocked.
 * @param location The location key (e.g., "france", "usa").
 * @returns The fallback prompt string.
 */
function getFallbackPrompt(location: string): string {
  const locationName = location.charAt(0).toUpperCase() + location.slice(1);
  return `Use the image person in this photo to keep the face as it. Create a photograph of the person in this image as if they were visiting ${locationName}. The photograph should show the person in a natural pose at a famous landmark or location in ${locationName}. Ensure the final image is a clear photograph that looks authentic and realistic.`;
}

/**
 * Processes the Gemini API response, extracting the image or throwing an error if none is found.
 * @param response The response from the generateContent call.
 * @returns A data URL string for the generated image.
 */
function processGeminiResponse(response: GenerateContentResponse): string {
  const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

  if (imagePartFromResponse?.inlineData) {
    const { mimeType, data } = imagePartFromResponse.inlineData;
    return `data:${mimeType};base64,${data}`;
  }

  const textResponse = response.text;
  console.error("API did not return an image. Response:", textResponse);
  throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

/**
 * A wrapper for the Gemini API call that includes a retry mechanism for internal server errors.
 * @param imagePart The image part of the request payload.
 * @param textPart The text part of the request payload.
 * @returns The GenerateContentResponse from the API.
 */
async function callGeminiWithRetry(imagePart: object, textPart: object): Promise<GenerateContentResponse> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const maxRetries = 3;
  const initialDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, textPart] },
      });
    } catch (error) {
      console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

      if (isInternalError && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`Internal error detected. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error; // Re-throw if not a retriable error or if max retries are reached.
    }
  }
  // This should be unreachable due to the loop and throw logic above.
  throw new Error("Gemini API call failed after all retries.");
}

/**
 * Generates a travel image from a source image and selected location.
 * It includes validation to ensure the uploaded image contains a person.
 * @param imageDataUrl A data URL string of the source image (e.g., 'data:image/png;base64,...').
 * @param location The selected location key.
 * @returns A promise that resolves to a base64-encoded image data URL of the generated image.
 */
export async function generateTravelImage(imageDataUrl: string, location: string): Promise<string> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
  }
  const [, mimeType, base64Data] = match;

  const imagePart = {
    inlineData: { mimeType, data: base64Data },
  };

  // First, validate that the image contains a person
  const validationPrompt = "Please analyze this image and tell me if it contains a person. Respond with only 'YES' if there is a person in the image, or 'NO' if there is no person in the image.";
  
  try {
    console.log("Validating that the uploaded image contains a person...");
    const validationResponse = await callGeminiWithRetry(imagePart, { text: validationPrompt });

    const validationText = validationResponse.text?.toLowerCase().trim();
    if (validationText !== 'yes') {
      throw new Error("Uploaded image is not of a person. Please upload a clear photo of yourself.");
    }

    console.log("Image validation successful. Proceeding with travel image generation...");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    if (errorMessage.includes("Uploaded image is not of a person")) {
      throw error; // Re-throw validation errors as-is
    }
    console.error("Error during image validation:", error);
    throw new Error("Failed to validate the uploaded image. Please try again.");
  }

  // Get the location-specific prompt
  const locationPrompt = LOCATION_PROMPTS[location as keyof typeof LOCATION_PROMPTS];
  if (!locationPrompt) {
    throw new Error(`Invalid location: ${location}`);
  }

  // --- First attempt with the original prompt ---
  try {
    console.log(`Attempting generation with original prompt for ${location}...`);
    const textPart = { text: locationPrompt };
    const response = await callGeminiWithRetry(imagePart, textPart);
    return processGeminiResponse(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const isNoImageError = errorMessage.includes("The AI model responded with text instead of an image");

    if (isNoImageError) {
      console.warn("Original prompt was likely blocked. Trying a fallback prompt.");
      
      // --- Second attempt with the fallback prompt ---
      try {
        const fallbackPrompt = getFallbackPrompt(location);
        console.log(`Attempting generation with fallback prompt for ${location}...`);
        const fallbackTextPart = { text: fallbackPrompt };
        const fallbackResponse = await callGeminiWithRetry(imagePart, fallbackTextPart);
        return processGeminiResponse(fallbackResponse);
      } catch (fallbackError) {
        console.error("Fallback prompt also failed.", fallbackError);
        const finalErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`The AI model failed with both original and fallback prompts. Last error: ${finalErrorMessage}`);
      }
    } else {
      // This is for other errors, like a final internal server error after retries.
      console.error("An unrecoverable error occurred during image generation.", error);
      throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
    }
  }
}
