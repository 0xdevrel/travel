/**
 * Utility functions for image processing on the client side
 */

export interface ProcessedImage {
  dataUrl: string;
  file: File;
  width: number;
  height: number;
}

/**
 * Processes and validates an uploaded image file
 * @param file The uploaded file
 * @returns Promise<ProcessedImage> Processed image data
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload a valid image file (JPG, PNG, GIF, WebP)');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to create canvas context'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions (max 1024px on the longest side)
        const maxDimension = 1024;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }

            // Create new file with processed image
            const processedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            // Convert to data URL
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                dataUrl: reader.result as string,
                file: processedFile,
                width: Math.round(width),
                height: Math.round(height),
              });
            };
            reader.onerror = () => reject(new Error('Failed to read processed image'));
            reader.readAsDataURL(processedFile);
          },
          'image/jpeg',
          0.9 // 90% quality
        );
      } catch (error) {
        reject(new Error('Failed to process image: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    };

    img.onerror = () => {
      reject(new Error('Invalid image file. Please upload a valid image.'));
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validates if an image contains a person (basic client-side validation)
 * @param dataUrl The image data URL
 * @returns boolean True if image appears to contain a person
 */
export function validatePersonImage(dataUrl: string): boolean {
  // Basic validation - check if image has reasonable dimensions
  const img = new Image();
  img.src = dataUrl;
  
  // For now, we'll do basic dimension validation
  // The actual person detection will be done by Gemini AI
  return img.width > 100 && img.height > 100;
}
