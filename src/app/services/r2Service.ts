/**
 * Cloudflare R2 service for uploading and managing generated images
 * 
 * NOTE: Install required packages first:
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Your R2 custom domain or public URL

// Initialize S3 client for R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Uploads a generated image to R2 storage
 * @param imageDataUrl - Base64 data URL of the generated image
 * @param userIdentifier - User's wallet address or username for folder structure
 * @param location - Location where the image was generated
 * @returns Promise<UploadResult>
 */
export async function uploadGeneratedImage(
  imageDataUrl: string,
  userIdentifier: string,
  location: string
): Promise<UploadResult> {
  try {
    // Validate environment variables
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      throw new Error('R2 configuration is incomplete. Please check environment variables.');
    }

    // Parse the data URL
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
      throw new Error('Invalid image data URL format');
    }

    const [, , base64Data] = match;
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `travel-photo-${location}-${timestamp}.jpg`;
    
    // Create folder structure: users/{userIdentifier}/{filename}
    const key = `users/${userIdentifier}/${filename}`;
    
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        location: location,
        userIdentifier: userIdentifier,
        timestamp: timestamp.toString(),
        generatedBy: 'travel-ai'
      }
    });

    await r2Client.send(uploadCommand);
    
    // Generate public URL
    const publicUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://pub-b5794e656d9c48929db83ef7e67a4a53.r2.dev/${key}`;

    console.log(`Successfully uploaded image to R2: ${key}`);
    
    return {
      success: true,
      url: publicUrl,
      key: key
    };

  } catch (error) {
    console.error('Error uploading to R2:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generates a signed URL for private access to an image
 * @param key - The R2 object key
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string | null>
 */
export async function getSignedImageUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      throw new Error('R2 configuration is incomplete');
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    return signedUrl;

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * Validates R2 configuration
 * @returns boolean
 */
export function validateR2Config(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
}
