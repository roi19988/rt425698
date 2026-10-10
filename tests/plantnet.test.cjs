const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decodeImages, mapResult, identifyPlant } = require('../server/plantnet.cjs');
const { validateIdentification } = require('../src/validation.cjs');
const png = { mimeType: 'image/png', base64: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64') };
const response = { results: [{ score: 0.9, species: { scientificName: 'Example species', family: { scientificName: 'Family' }, commonNames: [] }, gbif: { id: 123 } }] };
test('rejects empty, oversized and disguised image inputs', () => {
  for (const input of [[], Array(6).fill(png), [{ ...png, mimeType: 'image/jpeg' }], [{ ...png, base64: 'not an image' }]]) assert.throws(() => decodeImages(input));
});
test('real identification never claims verified edibility', () => {
  const result = validateIdentification(mapResult(response, { scientificName: 'Other species' }));
  assert.equal(result.safetyVerified, false);
  assert.ok(result.clues.some(clue => clue.includes('השתנה')));
  assert.equal(result.scientificName, 'Example species');
});
test('propagates quota failures without disclosing credentials', async () => {
  await assert.rejects(identifyPlant([png], null, 'test-secret', async () => ({ status: 429, ok: false })), error => error.status === 429 && !error.message.includes('test-secret'));
});
test('provider network errors do not expose secret URLs', async () => {
  await assert.rejects(identifyPlant([png], null, 'test-secret', async url => { throw new Error(String(url)); }), error => !error.message.includes('test-secret'));
});
