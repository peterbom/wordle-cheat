import {
	asLookup,
	getSortedGuessStats,
	getUpdatedPattern,
	getWord,
	type GuessStats,
	type GuessStatsLookup,
	type MatchLevel,
	type Pattern
} from './analysis/stats';

export type Turn = {
	guess: string;
	possibleAnswerStats: GuessStats[];
	pattern: Pattern;
	guessStats: GuessStats[];
	lookup: GuessStatsLookup;
};

export type Game = {
	turns: Turn[];
};

export function createGame(guesses: GuessStats[] | undefined, allowedAnswers: string[]): Game | undefined {
	if (!guesses || guesses.length === 0) {
		return undefined;
	}

	const answerSet = new Set(allowedAnswers);
	const possibleAnswerStats = guesses.filter(stats => answerSet.has(stats.guess))

	return {
		turns: [
			{
				guess: guesses[0].guess,
				possibleAnswerStats,
				pattern: 0,
				guessStats: guesses,
				lookup: asLookup(guesses)
			}
		]
	};
}

export function setGuess(game: Game, guess: string): Game {
	const lastTurn = game.turns[game.turns.length - 1];
	const newTurns = [...game.turns.slice(0, -1), { ...lastTurn, guess }];
	return { ...game, turns: newTurns };
}

export function setMatchLevel(game: Game, index: number, matchLevel: MatchLevel): Game {
	const lastTurn = game.turns[game.turns.length - 1];
	const newPattern = getUpdatedPattern(lastTurn.pattern, index, matchLevel);
	const newTurns = [...game.turns.slice(0, -1), { ...lastTurn, pattern: newPattern }];
	return { ...game, turns: newTurns };
}

export function getNextWord(game: Game): Game {
	const lastTurn = game.turns[game.turns.length - 1];
	const laswWordGuessStats = lastTurn.lookup.get(lastTurn.guess);
	if (!laswWordGuessStats) {
		return game;
	}

	const nextWordDistribs = laswWordGuessStats.patternAnswerDistribs.get(lastTurn.pattern);
	if (!nextWordDistribs || nextWordDistribs.length === 0) {
		return game;
	}

	const nextWordGuessStats = getSortedGuessStats(nextWordDistribs);
	if (nextWordGuessStats.length === 0) {
		// TODO: handle no next word
		return game;
	}

	const answerSet = new Set(nextWordDistribs.map(getWord));
	const possibleAnswerStats = nextWordGuessStats.filter(stats => answerSet.has(stats.guess));

	return {
		...game,
		turns: [
			...game.turns,
			{
				guess: nextWordGuessStats[0].guess,
				possibleAnswerStats,
				pattern: 0,
				guessStats: nextWordGuessStats,
				lookup: asLookup(nextWordGuessStats)
			}
		]
	};
}
