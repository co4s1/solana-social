// src/components/PostCard.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProfile } from '../hooks/useProfile';
import { usePosts } from '../hooks/usePosts';
import ReplyCreate from './ReplyCreate';

export default function PostCard({ post, showReplies = false }) {
  const [author, setAuthor] = useState(null);
  const [replies, setReplies] = useState([]);
  const { fetchProfileByWallet } = useProfile();
  const { fetchReplies } = usePosts();
  
  useEffect(() => {
    const loadAuthor = async () => {
      if (post.author) {
        const authorProfile = await fetchProfileByWallet(post.author);
        setAuthor(authorProfile);
      }
    };
    
    loadAuthor();
  }, [post.author, fetchProfileByWallet]);
  
  useEffect(() => {
    const loadReplies = async () => {
      if (showReplies && post.address) {
        const postReplies = await fetchReplies(post.address);
        setReplies(postReplies);
      }
    };
    
    loadReplies();
  }, [showReplies, post.address, fetchReplies]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-4">
      <div className="flex items-start mb-3">
        <div className="w-10 h-10 relative mr-3">
          {author?.image ? (
            <Image
              src={author.image}
              alt={author.username || 'User'}
              className="rounded-full object-cover"
              fill
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          )}
        </div>
        
        <div>
          <Link href={`/profile/${post.author}`}>
            <span className="font-semibold cursor-pointer hover:underline">
              {author?.username || 'Anonymous'}
            </span>
          </Link>
          <p className="text-gray-500 text-sm">{formatDate(post.timestamp)}</p>
        </div>
      </div>
      
      <p className="mb-3 whitespace-pre-wrap">{post.content}</p>
      
      {post.image && (
        <div className="mb-4 relative w-full h-64">
          <Image
            src={post.image}
            alt="Post image"
            className="rounded-md object-cover"
            fill
          />
        </div>
      )}
      
      <div className="flex justify-between">
        <Link href={`/post/${post.address}`}>
          <span className="text-blue-500 hover:underline cursor-pointer">
            {showReplies ? `${replies.length} replies` : 'View post'}
          </span>
        </Link>
      </div>
      
      {showReplies && (
        <div className="mt-4">
          {replies.map((reply) => (
            <div key={reply.address} className="border-t pt-3 mt-3">
              <ReplyCard reply={reply} />
            </div>
          ))}
          
          <ReplyCreate postId={post.address} />
        </div>
      )}
    </div>
  );
}

// Helper component for replies
function ReplyCard({ reply }) {
  const [author, setAuthor] = useState(null);
  const { fetchProfileByWallet } = useProfile();
  
  useEffect(() => {
    const loadAuthor = async () => {
      if (reply.author) {
        const authorProfile = await fetchProfileByWallet(reply.author);
        setAuthor(authorProfile);
      }
    };
    
    loadAuthor();
  }, [reply.author, fetchProfileByWallet]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex">
      <div className="w-8 h-8 relative mr-2">
        {author?.image ? (
          <Image
            src={author.image}
            alt={author.username || 'User'}
            className="rounded-full object-cover"
            fill
          />
        ) : (
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        )}
      </div>
      
      <div>
        <div className="flex items-center">
          <Link href={`/profile/${reply.author}`}>
            <span className="font-semibold text-sm cursor-pointer hover:underline mr-2">
              {author?.username || 'Anonymous'}
            </span>
          </Link>
          <span className="text-gray-500 text-xs">{formatDate(reply.timestamp)}</span>
        </div>
        <p className="text-sm mt-1">{reply.content}</p>
      </div>
    </div>
  );
}