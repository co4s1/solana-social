// src/pages/post/[id].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isValidPublicKey } from '../../utils/solana';
import { usePosts } from '../../hooks/usePosts';
import PostCard from '../../components/PostCard';

export default function PostPage() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fetchPost } = usePosts();

  useEffect(() => {
    const loadPost = async () => {
      if (!id || !isValidPublicKey(id)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const postData = await fetchPost(id);
        setPost(postData);
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id, fetchPost]);

  if (loading) {
    return <div className="text-center py-8">Loading post...</div>;
  }

  if (!id || !isValidPublicKey(id)) {
    return <div className="text-center py-8">Invalid post address</div>;
  }

  if (!post) {
    return <div className="text-center py-8">Post not found</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Post Details</h1>
      <PostCard post={post} showReplies={true} />
    </div>
  );
}