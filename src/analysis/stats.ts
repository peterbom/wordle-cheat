export const letters = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
] as const;
export type Letter = (typeof letters)[number];

export type LetterDistribution = {
  [letter in Letter]?: number[];
};

export enum MatchLevel {
  None = 0,
  Partial = 1,
  Exact = 2,
}

export type Pattern = number;

export type PartialPattern = [
  MatchLevel | null,
  MatchLevel | null,
  MatchLevel | null,
  MatchLevel | null,
  MatchLevel | null,
];

export type PatternAnswerDistributions = Map<Pattern, LetterDistribution[]>;

export type GuessStats = {
  guess: string;
  isPossibleAnswer: boolean;
  patternAnswerDistribs: PatternAnswerDistributions;
  avg: number;
  stdDev: number;
};

export type GuessStatsLookup = Map<string, GuessStats>;

export type GuessStatsStorable = {
  allowedAnswers: string[];
  orderedGuesses: string[];
  guessPatterns: Pattern[][]; // All the patterns for each guess
  guessPatternAnswerIndices: number[][][]; // All the answer indices for each pattern for each guess
  averages: number[];
  stdDevs: number[];
};

/*
{
  allowedAnswers: ["hello", "world", "apple", ...],
  orderedGuesses: ["hello", "world", "apple", "dates"],
  guessPatterns: [
    [0, 1, 2, 55],            // Patterns for "hello"
    [0, 2, 2, 3, 4, 33, 48],  // Patterns for "world"
    [0, 1, 2, 3, 4],          // Patterns for "apple"
  ],
  guessPatternAnswerIndices: [
    [
      [33, 952],               // Answer indices for pattern 0
      [100, 3],                // Answer indices for pattern 1
      [24, 74],                // Answer indices for pattern 2
      [92],                    // Answer indices for pattern 55
      ...
    ],
    ...
  ],
}
*/

export function fromStorable(storable: GuessStatsStorable): GuessStats[] {
  const allowedAnswerSet = new Set(storable.allowedAnswers);
  const guessStats: GuessStats[] = [];
  for (let guessIndex = 0; guessIndex < storable.orderedGuesses.length; guessIndex++) {
    const guess = storable.orderedGuesses[guessIndex];
    const guessPatterns = storable.guessPatterns[guessIndex];
    const guessPatternAnswerIndices = storable.guessPatternAnswerIndices[guessIndex];
    const patternAnswerDistribs: PatternAnswerDistributions = new Map();
    for (let patternIndex = 0; patternIndex < guessPatterns.length; patternIndex++) {
      const pattern = guessPatterns[patternIndex];
      const answerIndices = guessPatternAnswerIndices[patternIndex];
      const answers = answerIndices.map((answerIndex) => storable.allowedAnswers[answerIndex]);
      patternAnswerDistribs.set(pattern, answers.map(getLetterDistribution));
    }

    guessStats.push({
      guess,
      isPossibleAnswer: allowedAnswerSet.has(guess),
      patternAnswerDistribs,
      avg: storable.averages[guessIndex],
      stdDev: storable.stdDevs[guessIndex],
    });
  }

  return guessStats;
}

export function toStorable(guessStats: GuessStats[], allowedAnswers: string[]): GuessStatsStorable {
  const answerIndexLookup = Object.fromEntries(allowedAnswers.map((answer, i) => [answer, i]));
  const guessPatterns: Pattern[][] = [];
  const guessPatternAnswerIndices: number[][][] = [];
  const averages: number[] = [];
  const stdDevs: number[] = [];
  for (const guessStat of guessStats) {
    const patterns = [];
    const answerIndices = [];
    for (const [pattern, answerDistrib] of guessStat.patternAnswerDistribs) {
      patterns.push(pattern);
      answerIndices.push(answerDistrib.map((distrib) => answerIndexLookup[getWord(distrib)]));
    }
    guessPatterns.push(patterns);
    guessPatternAnswerIndices.push(answerIndices);
    averages.push(guessStat.avg);
    stdDevs.push(guessStat.stdDev);
  }

  return {
    allowedAnswers,
    orderedGuesses: guessStats.map((stats) => stats.guess),
    guessPatterns,
    guessPatternAnswerIndices,
    averages,
    stdDevs,
  };
}

export function asLookup(guessStats: GuessStats[]): GuessStatsLookup {
  return new Map(Object.entries(guessStats).map((entry) => [entry[1].guess, entry[1]]));
}

export function getSortedGuessStats(
  answerDistribs: LetterDistribution[],
  allowedGuesses: string[],
): GuessStats[] {
  const answerSet = new Set(answerDistribs.map(getWord));

  // If there are three or fewer possible remaining answers, choose one of those.
  // Otherwise, consider all possible words.
  const guesses = answerDistribs.length >= 3 ? allowedGuesses : [...answerSet];

  const guessStats: GuessStats[] = [];
  for (const guess of guesses) {
    const patternAnswerDistribs: PatternAnswerDistributions = new Map();
    for (const answerDistrib of answerDistribs) {
      const pattern = getPattern(guess, answerDistrib);
      if (patternAnswerDistribs.has(pattern)) {
        patternAnswerDistribs.get(pattern)!.push(answerDistrib);
      } else {
        patternAnswerDistribs.set(pattern, [answerDistrib]);
      }
    }

    const lengths = Array.from(patternAnswerDistribs, ([, value]) => value.length);
    guessStats.push({
      guess,
      isPossibleAnswer: answerSet.has(guess),
      patternAnswerDistribs,
      avg: getAverage(lengths),
      stdDev: getStandardDeviation(lengths),
    });
  }

  return guessStats.sort(compareStats);
}

function compareStats(statsA: GuessStats, statsB: GuessStats) {
  // Lower average should appear first
  const avgDiff = statsA.avg - statsB.avg;
  if (avgDiff !== 0) return avgDiff;

  // Lower std dev should appear first
  const stdDevDiff = statsA.stdDev - statsB.stdDev;
  if (stdDevDiff !== 0) return stdDevDiff;

  // Possible answers should appear first
  if (statsA.isPossibleAnswer || statsB.isPossibleAnswer) {
    if (statsA.isPossibleAnswer && !statsB.isPossibleAnswer) return -1;
    if (statsB.isPossibleAnswer && !statsA.isPossibleAnswer) return 1;
  }

  // If identical keep in alphabetical order
  return statsA.guess.localeCompare(statsB.guess);
}

export function getPattern(guess: string, answerDistrib: LetterDistribution): Pattern {
  let pattern: Pattern = 0;
  const guessedCounts: GuessCounts = {};
  for (let guessIndex = 0; guessIndex < 5; guessIndex++) {
    const guessLetter = guess[guessIndex] as Letter;
    const guessedCount = (guessedCounts[guessLetter] = (guessedCounts[guessLetter] || 0) + 1);
    if (guessLetter in answerDistrib) {
      const answerIndices = answerDistrib[guessLetter] || [];
      let matchLevel = MatchLevel.None;
      for (let answerIndex = guessedCount - 1; answerIndex < answerIndices.length; answerIndex++) {
        matchLevel = MatchLevel.Partial;
        if (answerIndices[answerIndex] === guessIndex) {
          matchLevel = MatchLevel.Exact;
          break;
        }
      }

      pattern += getPatternAtIndex(guessIndex, matchLevel);
    }
  }

  return pattern;
}

type GuessCounts = {
  [letter in Letter]?: number;
};

export function getUpdatedPattern(
  pattern: Pattern,
  index: number,
  matchLevel: MatchLevel,
): Pattern {
  const currentMatchLevel = getMatchLevelAtIndex(pattern, index);
  if (currentMatchLevel === matchLevel) {
    return pattern;
  }

  const currentPattern = getPatternAtIndex(index, currentMatchLevel);
  const newPattern = getPatternAtIndex(index, matchLevel);
  return pattern - currentPattern + newPattern;
}

function getPatternAtIndex(index: number, matchLevel: MatchLevel): Pattern {
  return matchLevel * 3 ** index;
}

export function getMatchLevelAtIndex(pattern: Pattern, index: number): MatchLevel {
  const ones = pattern % 3;
  if (index === 0) {
    return ones;
  }
  return getMatchLevelAtIndex((pattern - ones) / 3, index - 1);
}

export function getPossiblePatterns(guessStats: GuessStats): Pattern[] {
  return [...guessStats.patternAnswerDistribs.keys()].sort((a, b) => a - b);
}

export function getMatchingPatterns(
  patterns: Pattern[],
  partialPattern: PartialPattern,
): Pattern[] {
  for (let i = 0; i < 5; i++) {
    const matchLevel = partialPattern[i];
    if (matchLevel !== null) {
      patterns = patterns.filter((p) => getMatchLevelAtIndex(p, i) === matchLevel);
    }
  }
  return patterns;
}

export function asPattern(partialPattern: PartialPattern): Pattern {
  let pattern = 0;
  for (let i = 0; i < 5; i++) {
    const matchLevel = partialPattern[i];
    if (matchLevel !== null) {
      pattern = getUpdatedPattern(pattern, i, matchLevel);
    }
  }
  return pattern;
}

export function getLetterDistribution(word: string): LetterDistribution {
  const distrib: LetterDistribution = {};
  for (let i = 0; i < word.length; i++) {
    const letter = word[i] as Letter;
    const indices = (distrib[letter] = distrib[letter] || []);
    indices.push(i);
  }

  return distrib;
}

export function getWord(letterDistribution: LetterDistribution): string {
  const letters = Array(5).fill("_");
  for (const letter in letterDistribution) {
    for (const index of letterDistribution[letter as Letter]!) {
      letters[index] = letter;
    }
  }

  return letters.join("");
}

function getAverage(numbers: number[]) {
  if (numbers.length < 1) {
    return 0;
  }

  return numbers.reduce((a, b) => a + b) / numbers.length;
}

function getStandardDeviation(numbers: number[]) {
  if (numbers.length < 1) {
    return 0;
  }

  const average = numbers.reduce((a, b) => a + b) / numbers.length;
  return Math.sqrt(numbers.map((n) => (n - average) ** 2).reduce((a, b) => a + b) / numbers.length);
}
