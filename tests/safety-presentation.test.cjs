const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IMAGE_IDENTIFICATION_WARNING, UNVERIFIED_SAFETY_TEXT, safetyStatusText } = require('../src/safetyPresentation.cjs');

test('unverified safety information has an explicit independent-verification warning', () => {
  assert.equal(safetyStatusText(false), 'מידע זה לא עבר אימות בטיחות עצמאי.');
  assert.equal(safetyStatusText(false), UNVERIFIED_SAFETY_TEXT);
});

test('verified presentation remains separate from permission to eat or handle the specimen', () => {
  const text = safetyStatusText(true);
  assert.match(text, /בדיקה עצמאית/);
  assert.match(text, /אינו אישור/);
  assert.match(text, /לאכול או לגעת/);
});

test('image identification warning does not equate confidence with safety', () => {
  assert.match(IMAGE_IDENTIFICATION_WARNING, /זיהוי מתמונה אינו אישור/);
  assert.doesNotMatch(IMAGE_IDENTIFICATION_WARNING, /ודאות גבוהה.*בטוח/);
});

test('summary and expanded details render the reusable safety state', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
  assert.match(app, /field\.safety && <SafetyStatus verified=\{result\.safetyVerified\} compact/);
  assert.match(app, /field\.safety && <SafetyStatus verified=\{result\.safetyVerified\} \/>/);
  assert.match(app, /ודאות הזיהוי ומצב אימות הבטיחות הם מדדים נפרדים/);
  assert.match(app, /accessibilityRole="alert"/);
});
