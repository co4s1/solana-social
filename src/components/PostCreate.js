// src/components/PostCreate.js
import { useState } from 'react';
import { usePosts } from '../hooks/usePosts';
import ImageUpload from './ImageUpload';
import { MAX_CHAR_COUNT } from '../utils/constants';

export default function PostCreate() {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const { createPost } = usePosts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content) {
      alert('Content is required');
      return;
    }

    try {
      await createPost.mutateAsync({ content, imageFile });
      setContent('');
      setImageFile(null);
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Create Post</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
            placeholder="What's on your mind?"
            maxLength={MAX_CHAR_COUNT}
          />
          <p className="text-gray-500 text-sm mt-1">
            {content.length}/{MAX_CHAR_COUNT}
          </p>
        </div>
        
        <div className="mb-4">
          <ImageUpload onImageSelected={setImageFile} />
        </div>
        
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          disabled={createPost.isLoading || !content}
        >
          {createPost.isLoading ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  );
}