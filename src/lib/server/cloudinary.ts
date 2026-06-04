// src/lib/server/cloudinary.ts
// @ts-ignore
import { v2 as cloudinary } from 'cloudinary';

// Read CLOUDINARY_URL from environment at runtime. In some setups (or during
// typechecking) the SvelteKit '$env/static/private' export may not include
// the variable, so fall back to process.env.
const CLOUDINARY_URL = process.env.CLOUDINARY_URL ?? '';

// The SDK parses CLOUDINARY_URL automatically when set
if (CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: CLOUDINARY_URL });
}

interface UploadOptions {
  folder?:         string;
  public_id?:      string;
  overwrite?:      boolean;
  transformation?: object[];
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:         options.folder,
        public_id:      options.public_id,
        overwrite:      options.overwrite ?? true,
        transformation: options.transformation,
        resource_type:  'image',
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}