import React from 'react';
import { UnifiedStageModal } from './bride-journey/UnifiedStageModal';

/**
 * Replaced legacy BookingFinancesModal with UnifiedStageModal (Screenshot 1 design).
 * Tabs and legacy finances modal from Screenshot 2 are completely eliminated.
 */
export function BookingFinancesModal({ isOpen, onClose, client, booking, onUpdate }) {
  if (!isOpen) return null;
  const bride = client || booking?.client;
  const stage = bride?.current_stage || booking?.status || 'booking';

  return (
    <UnifiedStageModal
      isOpen={isOpen}
      onClose={onClose}
      bride={bride}
      stage={stage}
      onSuccess={onUpdate}
    />
  );
}

export default BookingFinancesModal;
