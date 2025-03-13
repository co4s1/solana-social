// src/pages/placeholder.js
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import the client wallet button with SSR disabled
const ClientWalletMultiButton = dynamic(
  () => import('../components/ClientWalletMultiButton'),
  { ssr: false }
);

export default function PlaceholderMode() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');

  // Sample data
  const SAMPLE_POSTS = [
    {
      id: 1,
      author: 'alice',
      content: 'Just deployed my first dApp on Solana! 🚀',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
    },
    {
      id: 2,
      author: 'bob',
      content: 'Learning about NFTs and token-gated communities. So much potential!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
    {
      id: 3,
      author: 'carol',
      content: 'Who wants to collaborate on a DAO project? Looking for devs and designers.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    },
  ];

  // Handle client-side only rendering
  useEffect(() => {
    setMounted(true);
    // Initialize with sample posts
    setPosts(SAMPLE_POSTS);
  }, []);

  // Handle profile creation
  const createProfile = (e) => {
    e.preventDefault();
    if (!username) return;
    
    setHasProfile(true);
    alert('Profile created in placeholder mode. This is not saved anywhere.');
  };

  // Handle new post
  const createPost = (e) => {
    e.preventDefault();
    if (!newPost) return;
    
    const post = {
      id: Date.now(),
      author: username,
      content: newPost,
      timestamp: new Date(),
    };
    
    setPosts([post, ...posts]);
    setNewPost('');
    
    alert('Post created in placeholder mode. This is not saved anywhere.');
  };

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-8">
        <p className="font-bold">Placeholder Mode</p>
        <p className="mb-2">
          This mode allows you to interact with the UI without needing a working Solana collection.
          Nothing is saved to the blockchain.
        </p>
        <Link href="/debug">
          <a className="text-blue-500 underline">Go to Debug Page</a>
        </Link>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">SolSocial Placeholder</h1>
        <div className="flex items-center space-x-4">
          <ClientWalletMultiButton />
          {connected && publicKey && (
            <div className="text-sm">
              <div>Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</div>
            </div>
          )}
        </div>
      </div>

      {connected ? (
        !hasProfile ? (
          <div className="bg-white shadow-md rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create Profile</h2>
            <form onSubmit={createProfile}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>
              
              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Create Profile
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="bg-white shadow-md rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Create Post</h2>
              <form onSubmit={createPost}>
                <div className="mb-4">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="What's on your mind?"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
                >
                  Post
                </button>
              </form>
            </div>
            
            <h2 className="text-xl font-semibold mb-4">Feed</h2>
            
            {posts.map((post) => (
              <div key={post.id} className="bg-white shadow-md rounded-xl p-6 mb-4">
                <div className="flex items-start mb-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" />
                  
                  <div>
                    <span className="font-semibold">{post.author}</span>
                    <p className="text-gray-500 text-sm">{formatDate(post.timestamp)}</p>
                  </div>
                </div>
                
                <p className="mb-3">{post.content}</p>
                
                <div className="flex justify-between">
                  <span className="text-blue-500 cursor-pointer">View post</span>
                </div>
              </div>
            ))}
          </>
        )
      ) : (
        <div className="bg-white shadow-md rounded-xl p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Welcome to SolSocial</h2>
          <p className="mb-4">Connect your wallet to get started</p>
        </div>
      )}
    </div>
  );
}