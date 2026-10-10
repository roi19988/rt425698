const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateIdentification } = require('../src/validation.cjs');
const fixture = () => ({ commonName: 'Example', scientificName: 'Example', family: 'Example', confidence: 'low', clues: [], alternatives: [], additionalPhoto: null, edibility: 'Unknown', toxicity: 'Unknown', traditionalUses: 'Unknown', otherUses: 'Unknown', facts: [], sources: [], safetyVerified: false });
test('accepts an explicitly unverified identification', () => assert.equal(validateIdentification(fixture()).safetyVerified, false));
test('rejects safety verification without sources', () => assert.throws(() => validateIdentification({ ...fixture(), safetyVerified: true })));
test('rejects executable source links', () => assert.throws(() => validateIdentification({ ...fixture(), sources: [{ title: 'Source', url: 'javascript:alert(1)' }] })));
test('rejects partial or malformed provider responses', () => {
  for (const value of [null, {}, { ...fixture(), confidence: 'certain' }, { ...fixture(), toxicity: '' }, { ...fixture(), clues: [3] }]) assert.throws(() => validateIdentification(value));
});
