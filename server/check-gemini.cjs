async function run() {
  const generating = process.argv.includes('--generate');
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const response = await fetch(generating ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` : 'https://generativelanguage.googleapis.com/v1beta/models', {
    method: generating ? 'POST' : 'GET',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    ...(generating ? { body: JSON.stringify({ contents: [{ parts: [{ text: process.argv.includes('--grounded') ? 'Search the web for the scientific name of the China rose. Reply with the scientific name only.' : 'Say מוכן in Hebrew.' }] }], generationConfig: { maxOutputTokens: 500, thinkingConfig: { thinkingLevel: 'low' } }, ...(process.argv.includes('--grounded') ? { tools: [{ google_search: {} }] } : {}) }) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  const message = data.error?.message?.split(process.env.GEMINI_API_KEY).join('[redacted]').slice(0, 500);
  const quota = data.error?.details?.flatMap(detail => (detail.violations || []).map(violation => ({ metric: violation.quotaMetric, limit: violation.quotaValue, id: violation.quotaId })));
  console.log(JSON.stringify({ status: response.status, errorCode: data.error?.status, reason: data.error?.details?.find(item => item.reason)?.reason, message, quota, retryDelay: data.error?.details?.find(detail => detail.retryDelay)?.retryDelay, generated: generating && response.ok ? data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') : undefined, models: !generating && response.ok ? data.models?.filter(model => model.supportedGenerationMethods?.includes('generateContent')).map(model => model.name).slice(0, 25) : undefined }));
  if (!response.ok) process.exitCode = 1;
}
run().catch(() => { console.error('Could not reach Gemini API'); process.exitCode = 1; });
