import { supabase } from '@/lib/supabaseClient';

/**
 * Upload a file to Supabase Storage
 * @param file The file to upload
 * @param bucket The storage bucket name
 * @param folder The folder within the bucket to upload to
 * @returns The public URL of the uploaded file or null if upload failed
 */
export const uploadFile = async (
  file: File,
  bucket: string = 'assets',
  folder: string = 'attachments'
): Promise<string | null> => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    // First, check what buckets are available
    let availableBuckets = [];
    try {
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      if (!bucketsError && bucketsData) {
        availableBuckets = bucketsData.map(b => b.name);
        console.log('Available buckets:', availableBuckets);
      }
    } catch (bucketError) {
      console.error('Error listing buckets:', bucketError);
    }
    
    // If no buckets are available, return null to avoid errors
    if (availableBuckets.length === 0) {
      console.log('No storage buckets available. File upload skipped.');
      return null;
    }
    
    // Try to upload to the specified bucket first
    let { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    // If that fails and it's a bucket not found error, try available buckets
    if (error && error.message && error.message.includes('Bucket not found')) {
      console.log(`Bucket '${bucket}' not found. Available buckets:`, availableBuckets);
      
      // Try each available bucket
      for (const availableBucket of availableBuckets) {
        console.log(`Trying to upload to bucket: ${availableBucket}`);
        const alternativeFileName = `${availableBucket}_${folder}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
        
        const { data: altData, error: altError } = await supabase.storage
          .from(availableBucket)
          .upload(alternativeFileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (!altError && altData) {
          // Success! Get the public URL
          const { data: { publicUrl: altPublicUrl } } = supabase.storage
            .from(availableBucket)
            .getPublicUrl(alternativeFileName);
          
          console.log(`Successfully uploaded to bucket: ${availableBucket}`);
          return altPublicUrl;
        } else {
          console.error(`Failed to upload to bucket ${availableBucket}:`, altError);
        }
      }
    }
    
    // If we still have an error, log it and return null
    if (error) {
      console.error('Error uploading file:', error);
      console.error('File size:', file.size);
      console.error('File type:', file.type);
      return null;
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

/**
 * Delete a file from Supabase Storage
 * @param filePath The path of the file to delete
 * @param bucket The storage bucket name
 * @returns True if successful, false otherwise
 */
export const deleteFile = async (
  filePath: string,
  bucket: string = 'assets'
): Promise<boolean> => {
  try {
    // First check if the bucket exists
    const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const bucketExists = bucketsData?.some(b => b.name === bucket);
    if (!bucketExists) {
      console.log(`Bucket ${bucket} does not exist. File deletion skipped.`);
      return true; // Return true since there's nothing to delete
    }
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

export default {
  uploadFile,
  deleteFile
};