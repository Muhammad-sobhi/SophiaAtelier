'use client';

import { useStore } from '../../context/StoreContext';
import AuthModal from './AuthModal';

export default function AuthModalWrapper() {
  const { authModalOpen, setAuthModalOpen } = useStore();
  return <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />;
}
