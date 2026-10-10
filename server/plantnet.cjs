function decodeImages(images) {
  if (!Array.isArray(images) || !images.length || images.length > 5) throw new Error('יש לשלוח בין תמונה אחת לחמש תמונות.');
  return images.map(image => {
    if (!image || !['image/jpeg', 'image/png'].includes(image.mimeType) || typeof image.base64 !== 'string' || image.base64.length > 6000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw new Error('יש לבחור תמונת JPEG או PNG תקינה בגודל מתאים.');
    const buffer = Buffer.from(image.base64, 'base64');
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if ((image.mimeType === 'image/jpeg' && !jpeg) || (image.mimeType === 'image/png' && !png)) throw new Error('תוכן התמונה אינו תואם לסוג הקובץ.');
    return { buffer, mimeType: image.mimeType };
  });
}

function mapResult(data, previous) {
  const candidates = (data.results || []).filter(item => item.species?.scientificName && Number.isFinite(item.score)).slice(0, 4);
  if (!candidates.length) throw new Error('לא נמצא זיהוי מתאים. נסו צילום ברור של עלה או פרח.');
  const best = candidates[0];
  const scientificName = best.species.scientificName;
  const score = Math.max(0, Math.min(1, best.score));
  const margin = score - (candidates[1]?.score || 0);
  // Conservative UI heuristic; these bins are not calibrated probabilities.
  const confidence = score >= 0.8 && margin >= 0.2 ? 'high' : score >= 0.5 ? 'moderate' : 'low';
  const clues = [`מנוע Pl@ntNet החזיר את המין הזה כמועמד המוביל. ציון התאמה: ${Math.round(score * 100)} מתוך 100. זהו ציון של המנוע, ולא אישור לזיהוי ודאי או לבטיחות.`, 'הסבר על מאפיינים חזותיים יתווסף לאחר חיבור שירות ההסבר.'];
  if (previous?.scientificName) clues.push(previous.scientificName === scientificName ? 'התמונות הנוספות הובילו לאותו מועמד מוביל כמו בזיהוי הקודם.' : `המועמד המוביל השתנה מהזיהוי הקודם (${String(previous.scientificName).slice(0, 150)}). אין להסתמך על הזיהוי הקודם.`);
  const sources = [{ title: 'מנוע הזיהוי Pl@ntNet', url: 'https://my.plantnet.org/' }];
  if (/^\d+$/.test(String(best.gbif?.id || ''))) sources.push({ title: 'רישום המין ב־GBIF', url: `https://www.gbif.org/species/${best.gbif.id}` });
  return {
    commonName: best.species.commonNames?.[0] || scientificName,
    scientificName,
    family: best.species.family?.scientificName || 'משפחה לא ידועה',
    confidence,
    clues,
    alternatives: candidates.slice(1).map(item => `${item.species.scientificName} — ציון התאמה ${Math.round(item.score * 100)}/100`),
    additionalPhoto: confidence === 'low' ? 'צלמו מקרוב פרח או פרי, ותמונה ברורה של עלה מאותו הצמח.' : null,
    edibility: 'מידע על אכילות לא נבדק בגרסה זו. אין להסיק מהזיהוי שהצמח, או חלק ממנו, בטוח למאכל.',
    toxicity: 'רעילות לאדם ולבעלי חיים לא נבדקה בגרסה זו. היעדר מידע אינו מעיד על בטיחות.',
    traditionalUses: 'מידע על שימושים מסורתיים יתווסף לאחר חיבור שירות הסבר ומקורות מהימנים.',
    otherUses: 'הזיהוי התקבל מ־Pl@ntNet. מידע על תפוצה, עונות ואקולוגיה טרם נבדק.',
    facts: [],
    sources,
    safetyVerified: false,
  };
}

async function identifyPlant(images, previous, apiKey, fetcher = fetch) {
  const decoded = decodeImages(images);
  const form = new FormData();
  decoded.forEach((image, index) => {
    form.append('images', new Blob([image.buffer], { type: image.mimeType }), `photo-${index}.${image.mimeType === 'image/png' ? 'png' : 'jpg'}`);
    form.append('organs', 'auto');
  });
  const url = new URL('https://my-api.plantnet.org/v2/identify/all');
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('lang', 'he');
  url.searchParams.set('nb-results', '4');
  let response;
  try { response = await fetcher(url, { method: 'POST', body: form, signal: AbortSignal.timeout(45000) }); }
  catch { throw new Error('לא ניתן להתחבר כרגע לשירות Pl@ntNet.'); }
  if (response.status === 429) throw Object.assign(new Error('מכסת הזיהוי נוצלה או שהשירות עמוס. נסו מאוחר יותר.'), { status: 429 });
  if (response.status === 401 || response.status === 403) throw new Error('שירות הזיהוי לא אישר את המפתח. יש לבדוק את הגדרת השרת.');
  if (response.status === 404 || response.status === 400) throw Object.assign(new Error('לא התקבל זיהוי מתאים. נסו צילום ברור של צמח.'), { status: 422 });
  if (!response.ok) throw new Error('שירות Pl@ntNet לא השלים את הזיהוי.');
  return mapResult(await response.json(), previous);
}
module.exports = { decodeImages, mapResult, identifyPlant };
