'use client';

import { useEffect, useState } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile';
import { fetchPublicSettings } from './api';

// Shown until the dashboard setting loads (and if the API is unreachable)
const FALLBACK_NUMBER = '+201554159359';

// libphonenumber groups Egyptian mobiles as "+20 15 54159359"; the site shows "+20 155 415 9359"
function formatDisplay(parsed) {
  const national = parsed.nationalNumber;
  if (parsed.countryCallingCode === '20' && national.length === 10) {
    return `+20 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  return parsed.formatInternational();
}

function toContact(e164) {
  const parsed = parsePhoneNumberFromString(e164 || '') || parsePhoneNumberFromString(FALLBACK_NUMBER);
  return {
    display: formatDisplay(parsed),
    telHref: `tel:${parsed.number}`,
    whatsappHref: `https://wa.me/${parsed.number.replace('+', '')}`,
  };
}

/** The atelier's WhatsApp / phone number, managed from the dashboard system settings */
export function useContactNumber() {
  const [number, setNumber] = useState(FALLBACK_NUMBER);

  useEffect(() => {
    let active = true;
    fetchPublicSettings().then((settings) => {
      if (active && settings?.whatsapp_number) setNumber(settings.whatsapp_number);
    });
    return () => {
      active = false;
    };
  }, []);

  return toContact(number);
}
