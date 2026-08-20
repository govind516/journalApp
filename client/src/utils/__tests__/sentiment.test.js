import { analyzeSentiment } from '../sentiment.js';

const { describe, it } = await import('node:test');
const assert = await import('node:assert/strict');

describe('Sentiment Analysis', () => {
  it('detects HAPPY sentiment', () => {
    const result = analyzeSentiment('I am so happy today! What a wonderful day.');
    assert.equal(result, 'HAPPY');
  });

  it('detects SAD sentiment', () => {
    const result = analyzeSentiment('I feel so sad and lonely. My heart is broken.');
    assert.equal(result, 'SAD');
  });

  it('detects ANGRY sentiment', () => {
    const result = analyzeSentiment('I am furious! This is so unfair and infuriating.');
    assert.equal(result, 'ANGRY');
  });

  it('detects ANXIOUS sentiment', () => {
    const result = analyzeSentiment('I am so anxious and worried about the exam tomorrow.');
    assert.equal(result, 'ANXIOUS');
  });

  it('returns NEUTRAL for neutral text', () => {
    const result = analyzeSentiment('The meeting is at 3pm in room 204.');
    assert.equal(result, 'NEUTRAL');
  });

  it('returns null for empty input', () => {
    assert.equal(analyzeSentiment(''), null);
    assert.equal(analyzeSentiment(null), null);
    assert.equal(analyzeSentiment(undefined), null);
  });

  it('handles mixed sentiments with strongest winning', () => {
    const result = analyzeSentiment('I am happy but also a bit worried about tomorrow.');
    assert.ok(['HAPPY', 'ANXIOUS'].includes(result), `should be HAPPY or ANXIOUS, got ${result}`);
  });

  it('handles case insensitivity', () => {
    const result = analyzeSentiment('HAPPY AND JOYFUL AND EXCITED');
    assert.equal(result, 'HAPPY');
  });

  it('handles multiple keyword matches', () => {
    const result = analyzeSentiment('sad sad sad happy');
    assert.equal(result, 'SAD');
  });
});
