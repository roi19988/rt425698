const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IMAGE_IDENTIFICATION_WARNING, UNVERIFIED_SAFETY_TEXT, safetyStatusText, summarySafetyAccessibilityLabel } = require('../src/safetyPresentation.cjs');

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

test('summary safety label includes the field description and one verification announcement', () => {
  const label = summarySafetyAccessibilityLabel('אכילות', 'אין מידע מספק על חלקי הצמח.', false);
  assert.match(label, /^אכילות\./);
  assert.match(label, /אין מידע מספק על חלקי הצמח/);
  assert.equal(label.match(/לא עבר אימות בטיחות עצמאי/g)?.length, 1);
  assert.match(label, /פתיחת פרטים$/);
});

test('summary and expanded details render the reusable safety state', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
  assert.match(app, /field\.safety && <SafetyStatus verified=\{result\.safetyVerified\} compact/);
  assert.match(app, /field\.safety && <SafetyStatus verified=\{result\.safetyVerified\} \/>/);
  assert.match(app, /accessible=\{!compact\}/);
  assert.match(app, /summarySafetyAccessibilityLabel\(field\.name, field\.text, result\.safetyVerified\)/);
  assert.match(app, /key=\{field\.name\} accessibilityRole="button" accessibilityLabel=/);
  assert.match(app, /accordionHeader:\{minHeight:44\}/);
  assert.match(app, /ודאות הזיהוי ומצב אימות הבטיחות הם מדדים נפרדים/);
  assert.match(app, /accessibilityRole="alert"/);
});
