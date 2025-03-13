// src/hooks/usePinata.js
import { useState } from 'react';
import axios from 'axios';

export const usePinata = () => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file) => {
    if (!file) return null;

    setUploading(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to our backend service
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Return the IPFS URL
      return response.data.url;
    } catch (error) {
      console.error('Error uploading to Pinata:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadImage,
    uploading,
  };
};