import { Identification, Photo } from './types';
import { validateIdentification } from './validation.cjs';

export const identifyUrl = process.env.EXPO_PUBLIC_IDENTIFY_URL?.trim() || '';

export async function identify(photos: Photo[], previous: Identification | null): Promise<Identification> {
  const localDevelopment = __DEV__ && /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?\//.test(identifyUrl);
  if (!identifyUrl.startsWith('https://') && !localDevelopment) throw new Error('יש להגדיר כתובת HTTPS לשירות הזיהוי.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(identifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'he', images: photos.map(photo => ({ base64: photo.base64, mimeType: photo.mimeType })), previousIdentification: previous }),
      signal: controller.signal,
    });
    if (response.status === 429) throw new Error('שירות הזיהוי עמוס. אפשר לנסות שוב בעוד רגע.');
    if (!response.ok) throw new Error('שירות הזיהוי לא הצליח להשלים את הבקשה.');
    return validateIdentification(await response.json());
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('הזיהוי נמשך זמן רב מדי. נסו שוב.');
    throw error;
  } finally { clearTimeout(timeout); }
}
