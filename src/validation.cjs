function validateIdentification(value) {
  if (!value || typeof value !== 'object') throw new Error('תגובה לא תקינה משירות הזיהוי.');
  for (const key of ['commonName', 'scientificName', 'family', 'edibility', 'toxicity', 'traditionalUses', 'otherUses']) {
    if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 12000) throw new Error('חסר מידע בתוצאת הזיהוי.');
  }
  if (!['high', 'moderate', 'low'].includes(value.confidence)) throw new Error('רמת ודאות לא תקינה.');
  for (const key of ['clues', 'alternatives', 'facts']) {
    if (!Array.isArray(value[key]) || value[key].length > 20 || !value[key].every(item => typeof item === 'string' && item.length <= 4000)) throw new Error('רשימת מידע לא תקינה.');
  }
  if (value.additionalPhoto !== null && typeof value.additionalPhoto !== 'string') throw new Error('בקשת צילום לא תקינה.');
  if (typeof value.safetyVerified !== 'boolean' || !Array.isArray(value.sources) || value.sources.length > 30) throw new Error('חסר מידע על מקורות.');
  for (const source of value.sources) {
    if (!source || typeof source.title !== 'string' || !source.title.trim() || typeof source.url !== 'string') throw new Error('מקור לא תקין.');
    let url;
    try { url = new URL(source.url); } catch { throw new Error('כתובת מקור לא תקינה.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('כתובת מקור לא בטוחה.');
  }
  if (value.safetyVerified && value.sources.length === 0) throw new Error('טענות בטיחות מאומתות מחייבות מקורות.');
  if (value.explanationStatus !== undefined && !['ready', 'unavailable'].includes(value.explanationStatus)) throw new Error('מצב הסבר לא תקין.');
  if (value.explanationNotice !== undefined && (typeof value.explanationNotice !== 'string' || value.explanationNotice.length > 2000)) throw new Error('הודעת הסבר לא תקינה.');
  if (value.searchEntryPoint !== undefined && (typeof value.searchEntryPoint !== 'string' || value.searchEntryPoint.length > 100000)) throw new Error('ייחוס חיפוש לא תקין.');
  return value;
}
module.exports = { validateIdentification };
