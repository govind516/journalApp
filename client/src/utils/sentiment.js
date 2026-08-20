const KEYWORDS = {
  HAPPY: [
    'happy', 'joy', 'joyful', 'great', 'amazing', 'wonderful', 'excellent',
    'good', 'love', 'loved', 'loving', 'fantastic', 'blessed', 'grateful',
    'thankful', 'excited', 'cheerful', 'delighted', 'thrilled', 'proud',
    'celebrate', 'celebration', 'smile', 'smiling', 'laugh', 'laughing',
    'fun', 'enjoy', 'enjoyed', 'beautiful', 'perfect', 'best', 'best day',
    'sunshine', 'bright', 'bliss', 'elated', 'euphoric', 'content',
    'pleased', 'satisfied', 'accomplished', 'achievement', 'success',
    'wins', 'winning', 'won', 'hopeful', 'optimistic', 'positive',
    'radiant', 'glorious', 'marvelous', 'superb', 'outstanding',
  ],
  SAD: [
    'sad', 'unhappy', 'depressed', 'depression', 'lonely', 'loneliness',
    'heartbroken', 'heartbreak', 'miserable', 'gloomy', 'melancholy',
    'sorrow', 'sorrowful', 'grief', 'grieving', 'loss', 'lost',
    'cry', 'crying', 'tears', 'tearful', 'weep', 'weeping',
    'hopeless', 'despair', 'despairing', 'devastated', 'broken',
    'empty', 'numb', 'down', 'low', 'blue', 'gloomy', 'bleak',
    'disappointed', 'disappointing', 'regret', 'regretful', 'miss',
    'missing', 'missed', 'hurt', 'pain', 'painful', 'suffering',
    'worthless', 'defeated', 'surrender', 'give up', 'tired of',
  ],
  ANGRY: [
    'angry', 'anger', 'mad', 'furious', 'irritated', 'annoyed',
    'frustrated', 'frustration', 'hate', 'hatred', 'rage', 'raging',
    'livid', 'outraged', 'furious', 'enraged', 'infuriated',
    'bitter', 'resentful', 'hostile', 'aggressive', 'aggression',
    'violent', 'violence', 'destroy', 'destroyed', 'wrecked',
    'pissed', 'pissed off', 'sick of', 'fed up', 'had enough',
    'unfair', 'injustice', 'betray', 'betrayed', 'betrayal',
    'revenge', 'vengeance', 'punish', 'confront', 'argument',
    'yell', 'yelling', 'scream', 'screaming', 'shout', 'shouting',
  ],
  ANXIOUS: [
    'anxious', 'anxiety', 'worried', 'worry', 'nervous', 'stressed',
    'stress', 'stressing', 'scared', 'afraid', 'fear', 'fearful',
    'panic', 'panicking', 'overwhelmed', 'overwhelming', 'tense',
    'restless', 'uneasy', 'unease', 'apprehensive', 'dread',
    'dreading', 'uncertain', 'unsure', 'doubt', 'doubtful',
    'confused', 'confusion', 'lost', 'helpless', 'helplessness',
    'vulnerable', 'insecure', 'insecurity', 'pressure', 'pressured',
    'burnout', 'burned out', 'exhausted', 'exhaustion', 'insomnia',
    'sleepless', 'racing thoughts', 'paranoia', 'phobia',
  ],
};

function countMatches(text, words) {
  let count = 0;
  const lower = text.toLowerCase();
  for (const word of words) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

export function analyzeSentiment(text) {
  if (!text || text.trim().length === 0) return null;

  const scores = {
    HAPPY: countMatches(text, KEYWORDS.HAPPY),
    SAD: countMatches(text, KEYWORDS.SAD),
    ANGRY: countMatches(text, KEYWORDS.ANGRY),
    ANXIOUS: countMatches(text, KEYWORDS.ANXIOUS),
  };

  const maxScore = Math.max(scores.HAPPY, scores.SAD, scores.ANGRY, scores.ANXIOUS);

  if (maxScore === 0) return 'NEUTRAL';

  const winners = Object.entries(scores).filter(([, s]) => s === maxScore);
  if (winners.length === 1) return winners[0][0];

  const priority = ['HAPPY', 'SAD', 'ANGRY', 'ANXIOUS'];
  for (const label of priority) {
    if (scores[label] === maxScore) return label;
  }

  return 'NEUTRAL';
}
