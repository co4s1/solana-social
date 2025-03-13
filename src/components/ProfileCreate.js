// src/components/ProfileCreate.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useProfile } from '../hooks/useProfile';
import ImageUpload from './ImageUpload';
import { MAX_CHAR_COUNT } from '../utils/constants';

export default function ProfileCreate() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const { createProfile } = useProfile();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username) {
      alert('Username is required');
      return;
    }

    try {
      await createProfile.mutateAsync({ username, bio, imageFile });
      router.push('/');
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Failed to create profile. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Create Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Profile Picture</label>
          <ImageUpload onImageSelected={setImageFile} />
        </div>
        
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
            maxLength={50}
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="bio" className="block text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            maxLength={MAX_CHAR_COUNT}
          />
          <p className="text-gray-500 text-sm mt-1">
            {bio.length}/{MAX_CHAR_COUNT}
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          disabled={createProfile.isLoading}
        >
          {createProfile.isLoading ? 'Creating...' : 'Create Profile'}
        </button>
      </form>
    </div>
  );
}
