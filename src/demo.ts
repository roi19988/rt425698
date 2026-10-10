import { Identification } from './types';

// Deliberately fictional: this fixture makes no botanical or safety claims.
export const demoResult: Identification = {
  commonName: 'צמח לדוגמה',
  scientificName: 'Demonstration only',
  family: 'משפחה לדוגמה',
  confidence: 'low',
  clues: ['כאן יוצגו מאפייני העלים, הפרחים והגבעול התומכים בזיהוי.', 'זו תצוגת הדגמה בלבד; לא בוצע ניתוח של התמונה.'],
  alternatives: ['כאן יוצגו מינים דומים כשהזיהוי אינו ודאי.'],
  additionalPhoto: 'בדוגמה זו: צילום מקרוב של העלה והפרח.',
  edibility: 'כאן יופיע מידע נפרד על פירות, זרעים, עלים וחלקים אחרים, כולל הכנה מסורתית ואי־ודאות. בדוגמה זו אין מידע על אכילות.',
  toxicity: 'כאן יופיעו סיכונים לאדם, לכלבים, לחתולים ולחיות משק, והחלקים שעלולים לגרום להרעלה או לגירוי. בדוגמה זו אין מידע בטיחותי.',
  traditionalUses: 'כאן יוצגו שימושים מתועדים כמזון, כחומר גלם, בחקלאות ובתרבות. שימושים ברפואה מסורתית יסומנו ככאלה, ולא כטיפול מוכח.',
  otherUses: 'כאן יוצגו תפוצה, עונת פריחה, תפקיד אקולוגי ושימושי נוי או צל.',
  facts: ['בזיהוי אמיתי יוצגו עד שלוש עובדות מעניינות עם מקורות.'],
  sources: [],
  safetyVerified: false,
};
