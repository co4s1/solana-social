// src/components/Feed.js
import { usePosts } from '../hooks/usePosts';
import PostCreate from './PostCreate';
import PostCard from './PostCard';
import { useAuth } from './AuthProvider';

export default function Feed() {
  const { posts, isLoadingPosts } = usePosts();
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {isAuthenticated && <PostCreate />}
      
      <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
      
      {isLoadingPosts ? (
        <div className="text-center py-8">Loading posts...</div>
      ) : posts?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          No posts yet
        </div>
      ) : (
        posts?.map((post) => (
          <PostCard key={post.address} post={post} />
        ))
      )}
    </div>
  );
}