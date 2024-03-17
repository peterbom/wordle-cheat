import {
  asLookup,
  getSortedGuessStats,
  getWord,
  MatchLevel,
  type GuessStats,
  type GuessStatsLookup,
  type Pattern,
  getPossiblePatterns,
  type PartialPattern,
  getMatchingPatterns,
  asPattern,
} from "./analysis/stats";

export type Turn = {
  guessStats: GuessStats;
  possibleAnswerStats: GuessStats[];
  possiblePatterns: Pattern[];
  partialPattern: PartialPattern;
  pattern: Pattern | null;
  allGuessStats: GuessStats[];
  lookup: GuessStatsLookup;
};

export type Game = {
  turns: Turn[];
};

export function createGame(
  guesses: GuessStats[] | undefined,
  allowedAnswers: string[],
): Game | undefined {
  if (!guesses || guesses.length === 0) {
    return undefined;
  }

  const answerSet = new Set(allowedAnswers);
  const possibleAnswerStats = guesses.filter((stats) => answerSet.has(stats.guess));
  const guessStats = guesses[0];

  return {
    turns: [
      {
        guessStats,
        possibleAnswerStats,
        possiblePatterns: getPossiblePatterns(guessStats),
        partialPattern: [null, null, null, null, null],
        pattern: null,
        allGuessStats: guesses,
        lookup: asLookup(guesses),
      },
    ],
  };
}

export function setGuess(game: Game, guess: string): Game {
  const lastTurn = game.turns[game.turns.length - 1];
  const guessStats = lastTurn.lookup.get(guess);
  if (!guessStats) {
    return game;
  }

  const updatedLastTurn: Turn = {
    ...lastTurn,
    guessStats,
    possiblePatterns: getPossiblePatterns(guessStats),
    partialPattern: [null, null, null, null, null],
    pattern: null,
  };

  const newTurns: Turn[] = [...game.turns.slice(0, -1), updatedLastTurn];
  return { ...game, turns: newTurns };
}

export function togglePartialPattern(game: Game, index: number): Game {
  const lastTurn = game.turns[game.turns.length - 1];
  const partialPattern: PartialPattern = [...lastTurn.partialPattern];
  let matchingPatterns: Pattern[];
  do {
    const currentMatchLevelAtIndex = partialPattern[index];
    const currentMatchLevelNumber =
      currentMatchLevelAtIndex === null ? -1 : currentMatchLevelAtIndex;
    const newMatchLevelAtIndex = ((currentMatchLevelNumber + 1) % 3) as MatchLevel;
    partialPattern[index] = newMatchLevelAtIndex;
    matchingPatterns = getMatchingPatterns(lastTurn.possiblePatterns, partialPattern);
  } while (matchingPatterns.length === 0);

  const updatedLastTurn = {
    ...lastTurn,
    partialPattern,
    pattern: matchingPatterns.length === 1 ? matchingPatterns[0] : null,
  };

  return {
    ...game,
    turns: [...game.turns.slice(0, -1), updatedLastTurn],
  };
}

export function setLastTurnPattern(game: Game, pattern: Pattern): Game {
  const lastTurn = game.turns[game.turns.length - 1];
  const updatedTurns = [...game.turns.slice(0, -1), { ...lastTurn, pattern }];
  return { ...game, turns: updatedTurns };
}

export function setNextWord(game: Game): Game {
  const lastTurn = game.turns[game.turns.length - 1];
  if (lastTurn.pattern === null) {
    return game;
  }

  const nextWordDistribs = lastTurn.guessStats.patternAnswerDistribs.get(lastTurn.pattern);
  if (!nextWordDistribs || nextWordDistribs.length === 0) {
    return game;
  }

  const nextWordGuessStats = getSortedGuessStats(nextWordDistribs);
  if (nextWordGuessStats.length === 0) {
    // TODO: handle no next word
    return game;
  }

  const answerSet = new Set(nextWordDistribs.map(getWord));
  const possibleAnswerStats = nextWordGuessStats.filter((stats) => answerSet.has(stats.guess));
  const guessStats = nextWordGuessStats[0];
  const isComplete = possibleAnswerStats.length === 1;
  const partialPattern: PartialPattern = isComplete
    ? [MatchLevel.Exact, MatchLevel.Exact, MatchLevel.Exact, MatchLevel.Exact, MatchLevel.Exact]
    : [null, null, null, null, null];
  const pattern = isComplete ? asPattern(partialPattern) : null;

  return {
    ...game,
    turns: [
      ...game.turns,
      {
        guessStats,
        possibleAnswerStats,
        possiblePatterns: getPossiblePatterns(guessStats),
        partialPattern,
        pattern,
        allGuessStats: nextWordGuessStats,
        lookup: asLookup(nextWordGuessStats),
      },
    ],
  };
}

export function deleteLastTurn(game: Game): Game {
  if (game.turns.length <= 1) {
    return game;
  }

  const newTurns: Turn[] = game.turns.slice(0, -1);
  const lastTurn = newTurns[newTurns.length - 1];
  const updatedTurns: Turn[] = [...newTurns.slice(0, -1), { ...lastTurn, pattern: null }];

  return { ...game, turns: updatedTurns };
}
