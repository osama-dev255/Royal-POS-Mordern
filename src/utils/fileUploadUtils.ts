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
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    // Upload directly to the specified bucket
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error.message);
      return null;
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    console.log('File uploaded successfully:', publicUrl);
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