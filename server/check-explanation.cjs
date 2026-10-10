const { explainPlant } = require('./gemini.cjs');
const { mapResult } = require('./plantnet.cjs');
const base = mapResult({ results: [{ score: 0.4, species: { scientificName: 'Hibiscus rosa-sinensis L.', family: { scientificName: 'Malvaceae' }, commonNames: [] } }] });
let calls = 0;
const diagnosticFetch = async (url, options) => {
  calls++;
  const response = await fetch(url, options);
  const data = await response.clone().json();
  const candidate = data.candidates?.[0];
  const message = data.error?.message?.split(process.env.GEMINI_API_KEY).join('[redacted]').slice(0, 500);
  const text = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('');
  let keys;
  try { keys = Object.keys(JSON.parse(text)); } catch { keys = ['not JSON']; }
  console.log(JSON.stringify({ call: calls, status: response.status, error: message, finishReason: candidate?.finishReason, textLength: text?.length, keys, grounding: Boolean(candidate?.groundingMetadata) }));
  return response;
};
explainPlant(base, [], process.env.GEMINI_API_KEY, diagnosticFetch).then(result => console.log(JSON.stringify({ status: result.explanationStatus, notice: result.explanationNotice, sourceCount: result.sources.length })));
