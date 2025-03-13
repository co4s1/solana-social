// src/components/Profile.js
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePosts } from '../hooks/usePosts';
import PostCard from './PostCard';

export default function Profile({ profile }) {
  const [posts, setPosts] = useState([]);
  const { fetchPostsByUser } = usePosts();
  
  useEffect(() => {
    const loadPosts = async () => {
      if (profile?.authorAddress) {
        const userPosts = await fetchPostsByUser(profile.authorAddress);
        setPosts(userPosts);
      }
    };
    
    loadPosts();
  }, [profile, fetchPostsByUser]);

  if (!profile) {
    return <div className="text-center py-8">Profile not found</div>;
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-32 h-32 relative mb-4 md:mb-0 md:mr-6">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.username || 'User'}
                className="rounded-full object-cover"
                fill
              />
            ) : (
              <div className="w-32 h-32 bg-gray-300 rounded-full"></div>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold mb-2">{profile.username || 'Anonymous'}</h1>
            <p className="text-gray-600 mb-4">{profile.description}</p>
            <p className="text-gray-500 text-sm">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Posts</h2>
      
      {posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          No posts yet
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.address} post={post} />
        ))
      )}
    </div>
  );
}