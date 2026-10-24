const UNVERIFIED_SAFETY_TEXT = 'מידע זה לא עבר אימות בטיחות עצמאי.';
const VERIFIED_SAFETY_TEXT = 'המידע התומך עבר בדיקה עצמאית, אך אינו אישור לאכול או לגעת בפרט המצולם.';
const IMAGE_IDENTIFICATION_WARNING = 'זיהוי מתמונה אינו אישור לאכילה, למגע או לשימוש רפואי. אין לאכול, לטעום או לתת לבעלי חיים צמח על סמך זיהוי מתמונה בלבד.';

function safetyStatusText(safetyVerified) {
  return safetyVerified ? VERIFIED_SAFETY_TEXT : UNVERIFIED_SAFETY_TEXT;
}

function summarySafetyAccessibilityLabel(fieldName, description, safetyVerified) {
  return `${fieldName}. ${safetyStatusText(safetyVerified)} ${description} פתיחת פרטים`;
}

module.exports = { IMAGE_IDENTIFICATION_WARNING, UNVERIFIED_SAFETY_TEXT, VERIFIED_SAFETY_TEXT, safetyStatusText, summarySafetyAccessibilityLabel };
