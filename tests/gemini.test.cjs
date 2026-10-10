const { test } = require('node:test');
const assert = require('node:assert/strict');
const { explainPlant, groundingSources, mergeExplanation } = require('../server/gemini.cjs');
const base = () => ({ commonName: 'Plant', scientificName: 'Example species', family: 'Family', confidence: 'low', clues: ['Provider score', 'Unavailable'], alternatives: ['Other species'], additionalPhoto: null, edibility: 'Unknown', toxicity: 'Unknown', traditionalUses: 'Unknown', otherUses: 'Unknown', facts: [], sources: [], safetyVerified: false });
const detail = () => ({ commonName: 'צמח', confidence: 'high', clues: ['Visible leaves'], additionalPhoto: null, edibility: 'Not verified', toxicity: 'Not verified', traditionalUses: 'Traditional use', otherUses: 'Ecology', facts: ['Fact'] });
test('Gemini cannot replace the species, upgrade confidence or certify safety', () => {
  const result = mergeExplanation(base(), { ...detail(), scientificName: 'Different species', safetyVerified: true }, [{ title: 'Source', url: 'https://example.org/species' }]);
  assert.equal(result.scientificName, 'Example species');
  assert.equal(result.confidence, 'low');
  assert.equal(result.safetyVerified, false);
});
test('source list uses grounding metadata and rejects unsafe URLs', () => {
  assert.deepEqual(groundingSources({ groundingChunks: [{ web: { title: 'Bad', uri: 'javascript:alert(1)' } }, { web: { title: 'Source', uri: 'https://example.org' } }, { web: { title: 'Duplicate', uri: 'https://example.org' } }] }), [{ title: 'Source', url: 'https://example.org' }]);
});
test('quota or network failure preserves identification without leaking the key', async () => {
  for (const fetcher of [async () => ({ ok: false, status: 429 }), async () => { throw new Error('secret-key'); }]) {
    const result = await explainPlant(base(), [], 'secret-key', fetcher);
    assert.equal(result.scientificName, 'Example species');
    assert.equal(result.explanationStatus, 'unavailable');
    assert.ok(!result.explanationNotice.includes('secret-key'));
  }
});
test('structured explanation only uses sources returned by search', async () => {
  let calls = 0;
  const fetcher = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls++;
    assert.equal(options.headers['x-goog-api-key'], 'secret-key');
    assert.equal(Boolean(body.tools), calls === 1);
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: calls === 1 ? 'Research' : JSON.stringify({ ...detail(), sources: [{ title: 'Invented', url: 'https://invented.example' }] }) }] }, groundingMetadata: calls === 1 ? { groundingChunks: [{ web: { title: 'Real', uri: 'https://example.org/species' } }], searchEntryPoint: { renderedContent: '<div>Google</div>' } } : undefined }] }) };
  };
  const result = await explainPlant(base(), [], 'secret-key', fetcher);
  assert.equal(result.explanationStatus, 'ready');
  assert.deepEqual(result.sources, [{ title: 'Real', url: 'https://example.org/species' }]);
  assert.equal(result.searchEntryPoint, '<div>Google</div>');
  assert.equal(calls, 2);
});
test('truncated model output is rejected and falls back to plant identification', async () => {
  const result = await explainPlant(base(), [], 'secret-key', async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{partial' }] } }] }) }));
  assert.equal(result.explanationStatus, 'unavailable');
});
