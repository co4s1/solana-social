// src/pages/profile/[address].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isValidPublicKey } from '../../utils/solana';
import { useProfile } from '../../hooks/useProfile';
import Profile from '../../components/Profile';

export default function ProfilePage() {
  const router = useRouter();
  const { address } = router.query;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fetchProfileByWallet } = useProfile();

  useEffect(() => {
    const loadProfile = async () => {
      if (!address || !isValidPublicKey(address)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const profileData = await fetchProfileByWallet(address);
        setProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [address, fetchProfileByWallet]);

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (!address || !isValidPublicKey(address)) {
    return <div className="text-center py-8">Invalid profile address</div>;
  }

  return (
    <div>
      <Profile profile={profile} />
    </div>
  );
}