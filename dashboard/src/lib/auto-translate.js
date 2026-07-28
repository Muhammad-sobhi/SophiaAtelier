/**
 * Helper to auto-translate text between English and Arabic
 */
export async function autoTranslateText(text, fromLang, toLang) {
  if (!text || !text.trim()) return '';

  try {
    const langpair = `${fromLang}|${toLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${langpair}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (error) {
    console.error('Auto-translation failed:', error);
  }

  // Fallback simple dictionary for dress names and fabrics
  const fallbackDict = {
    'Celestial Rose': 'سليستيال روز',
    'Midnight Bloom': 'ميدنايت بلوم',
    'Pearl Cascade': 'بيرل كاسكيد',
    'Velvet Dusk': 'فيلفيت دسك',
    'Starlight Sequin': 'ستارلايت سيكوين',
    'Dusty Petal': 'داستي بيتال',
    'Ethereal Mist': 'إيثيريال ميست',
    'Royal Silk': 'رويال سيلك',
    'Satin': 'ساتان',
    'Tulle': 'تول',
    'Silk': 'حرير',
    'Chiffon': 'شيفون',
    'Crepe': 'كريب',
    'Velvet': 'مخمل',
    'Lace': 'دانتيل',
    'Organza': 'أورجانزا',
    'Wedding Dress': 'فستان زفاف',
    'Evening Gown': 'فستان سهرة',
    'Bridesmaid': 'فستان إشبيلا'
  };

  if (fromLang === 'en' && fallbackDict[text.trim()]) {
    return fallbackDict[text.trim()];
  }

  // Reverse mapping lookup
  if (fromLang === 'ar') {
    for (const [enKey, arVal] of Object.entries(fallbackDict)) {
      if (arVal === text.trim()) return enKey;
    }
  }

  return text;
}