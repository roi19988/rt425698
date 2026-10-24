const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateIdentification } = require('../src/validation.cjs');
const fixture = () => ({ commonName: 'Example', scientificName: 'Example', family: 'Example', confidence: 'low', clues: [], alternatives: [], additionalPhoto: null, edibility: 'Unknown', toxicity: 'Unknown', traditionalUses: 'Unknown', otherUses: 'Unknown', facts: [], sources: [], safetyVerified: false });
test('accepts an explicitly unverified identification', () => assert.equal(validateIdentification(fixture()).safetyVerified, false));
test('accepts verified safety only when at least one valid source is present', () => {
  const result = validateIdentification({ ...fixture(), safetyVerified: true, sources: [{ title: 'Independent review', url: 'https://example.org/review' }] });
  assert.equal(result.safetyVerified, true);
});
test('rejects safety verification without sources', () => assert.throws(() => validateIdentification({ ...fixture(), safetyVerified: true })));
test('rejects missing or invalid safety verification state', () => {
  const { safetyVerified: _omitted, ...missing } = fixture();
  for (const value of [missing, { ...fixture(), safetyVerified: 'false' }, { ...fixture(), safetyVerified: null }]) assert.throws(() => validateIdentification(value));
});
test('rejects invalid or unsafe source links regardless of verification state', () => {
  for (const url of ['javascript:alert(1)', 'http://example.org', 'not a url', 'https://user:pass@example.org']) {
    assert.throws(() => validateIdentification({ ...fixture(), sources: [{ title: 'Source', url }] }));
  }
});
test('rejects partial or malformed provider responses', () => {
  for (const value of [null, {}, { ...fixture(), confidence: 'certain' }, { ...fixture(), toxicity: '' }, { ...fixture(), clues: [3] }]) assert.throws(() => validateIdentification(value));
});
