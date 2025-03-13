// src/components/ImageUpload.js
import { useState, useRef } from 'react';
import Image from 'next/image';

export default function ImageUpload({ onImageSelected }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Please select an image under 5MB.');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Send file to parent component
    onImageSelected(file);
  };

  return (
    <div className="flex flex-col items-center">
      {previewUrl ? (
        <div className="mb-4 relative w-32 h-32">
          <Image
            src={previewUrl}
            alt="Preview"
            className="rounded-full object-cover"
            fill
          />
        </div>
      ) : (
        <div className="mb-4 w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-gray-500">No image</span>
        </div>
      )}
      
      <button
        type="button"
        onClick={() => fileInputRef.current.click()}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md"
      >
        {previewUrl ? 'Change Image' : 'Upload Image'}
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}