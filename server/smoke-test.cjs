const { identifyPlant } = require('./plantnet.cjs');
const { validateIdentification } = require('../src/validation.cjs');
// Public example from the official Pl@ntNet guide, not a user's private image.
async function run() {
  const image = await fetch('https://my.plantnet.org/images/image_1.jpeg', { signal: AbortSignal.timeout(20000) });
  if (!image.ok) throw new Error('Could not retrieve official sample image');
  const base64 = Buffer.from(await image.arrayBuffer()).toString('base64');
  const images = [{ base64, mimeType: 'image/jpeg' }];
  let result;
  if (process.argv.includes('--local')) {
    const response = await fetch('http://127.0.0.1:4040/identify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, previousIdentification: null, language: 'he' }),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error('Local API did not complete identification');
    result = validateIdentification(await response.json());
  } else {
    result = validateIdentification(await identifyPlant(images, null, process.env.PLANTNET_API_KEY));
  }
  console.log(JSON.stringify({ identification: result.scientificName, confidence: result.confidence, safetyVerified: result.safetyVerified, explanationStatus: result.explanationStatus, explanationNotice: result.explanationNotice, sourceCount: result.sources.length, hasSearchAttribution: Boolean(result.searchEntryPoint), hasHebrewExplanation: /[א-ת]/.test(result.traditionalUses) }));
  if (process.argv.includes('--require-explanation') && result.explanationStatus !== 'ready') process.exitCode = 1;
}
run().catch(error => { console.error(error.message.includes('Pl@ntNet') ? error.message : 'Network sample test could not complete'); process.exitCode = 1; });
