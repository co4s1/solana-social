// src/components/ReplyCreate.js
import { useState } from 'react';
import { usePosts } from '../hooks/usePosts';
import { MAX_CHAR_COUNT } from '../utils/constants';

export default function ReplyCreate({ postId }) {
  const [content, setContent] = useState('');
  const { createReply } = usePosts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content) {
      alert('Content is required');
      return;
    }

    try {
      await createReply.mutateAsync({ content, parentPost: postId });
      setContent('');
    } catch (error) {
      console.error('Error creating reply:', error);
      alert('Failed to create reply. Please try again.');
    }
  };

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-lg font-semibold mb-2">Leave a Reply</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            rows={2}
            placeholder="Write your reply..."
            maxLength={MAX_CHAR_COUNT}
          />
          <p className="text-gray-500 text-sm mt-1">
            {content.length}/{MAX_CHAR_COUNT}
          </p>
        </div>
        
        <button
          type="submit"
          className="bg-blue-500 text-white py-1 px-3 rounded-md hover:bg-blue-600 text-sm"
          disabled={createReply.isLoading || !content}
        >
          {createReply.isLoading ? 'Sending...' : 'Reply'}
        </button>
      </form>
    </div>
  );
}