<script lang="ts">
	import './styles.css';

	import { liveQuery } from 'dexie';
	import { db } from './analysis/storage';
	import { allowedAnswers } from './analysis/words';
	import {
		MatchLevel,
		getLetterDistribution,
		getMatchLevelAtIndex,
		getSortedGuessStats,
		type GuessStats
	} from './analysis/stats';
	import { setMatchLevel, createGame, setGuess, getNextWord } from './game';

	$: allGuessStats = liveQuery(async () => {
		let guessesData = await db.data.get('guesses');
		if (!guessesData) {
			const allowedAnswerDistribs = allowedAnswers.map(getLetterDistribution);
			guessesData = { id: 'guesses', value: getSortedGuessStats(allowedAnswerDistribs) };
			await db.data.add(guessesData);
		}

		return guessesData?.value || [];
	});

	$: guessCount = 200000;
	$: game = createGame($allGuessStats);

	function handleMatchLevelSelect(column: number, matchLevel: MatchLevel) {
		game = game && setMatchLevel(game, column, matchLevel);
	}

	function handleGuessClick(guess: GuessStats) {
		game = game && setGuess(game, guess.guess);
	}

	function handleGetNextWord() {
		game = game && getNextWord(game);
	}
</script>

{#if !game}
	<h2>Loading...</h2>
{:else}
	{@const lastTurn = game.turns[game.turns.length - 1]}
	{@const guessStats = lastTurn.guessStats.slice(0, guessCount)}
	<div class="grid">
		{#each Array(game.turns.length) as _, turnIndex (turnIndex)}
			{@const current = turnIndex === game.turns.length - 1}
			{@const turn = game.turns[turnIndex]}
			<div class="row" class:current>
				{#each Array.from(Array(5).keys()) as column (column)}
					{@const value = turn.guess[column]}
					{@const matchLevel = getMatchLevelAtIndex(turn.pattern, column)}
					{@const exact = matchLevel === MatchLevel.Exact}
					{@const partial = matchLevel === MatchLevel.Partial}
					{@const missing = matchLevel === MatchLevel.None}
					<div class="letter" class:exact class:partial class:missing>
						{value}
						<span class="visually-hidden">
							{#if exact}
								(correct)
							{:else if partial}
								(present)
							{:else}
								(missing)
							{/if}
						</span>
						<input name="guess" disabled={!current} type="hidden" {value} />
					</div>
				{/each}
				{#if current}
					<button on:click={handleGetNextWord}>Next Word</button>
					{#each Array.from(Array(5).keys()) as column (column)}
						<div class="matchselector">
							<button
								class="missing"
								on:click={() => handleMatchLevelSelect(column, MatchLevel.None)}
							/>
							<button
								class="partial"
								on:click={() => handleMatchLevelSelect(column, MatchLevel.Partial)}
							/>
							<button
								class="exact"
								on:click={() => handleMatchLevelSelect(column, MatchLevel.Exact)}
							/>
						</div>
					{/each}
				{/if}
			</div>
		{/each}
	</div>
	<ul class="responsive-table">
		<li class="table-header">
			<div class="col col-1">Guess</div>
			<div class="col col-2">Expected words remaining</div>
			<div class="col col-3">Standard deviation of remaining word counts</div>
		</li>
		{#each guessStats as guess}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<li class="table-row" on:click={() => handleGuessClick(guess)}>
				<div class="col col-1">{guess.guess}</div>
				<div class="col col-2">{guess.avg.toFixed(2)}</div>
				<div class="col col-3">{guess.stdDev.toFixed(2)}</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.grid {
		--width: min(100vw, 40vh, 380px);
		max-width: var(--width);
		align-self: center;
		justify-self: center;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
	}

	.grid .row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		grid-gap: 0.2rem;
		margin: 0 0 0.2rem 0;
	}

	.grid .row.current {
		width: calc(var(--width) / 5 * 6);
		grid-template-columns: repeat(6, 1fr);
	}

	.row.current {
		filter: drop-shadow(3px 3px 10px var(--color-bg-0));
	}

	.letter {
		aspect-ratio: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		box-sizing: border-box;
		text-transform: lowercase;
		border: none;
		font-size: calc(0.08 * var(--width));
		border-radius: 2px;
		background: white;
		margin: 0;
		color: rgba(0, 0, 0, 0.7);
	}

	.matchselector {
		width: 100%;
		height: 50%;
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		text-align: center;
		box-sizing: border-box;
		margin: 0;
	}

	.matchselector > * {
		border: none;
		cursor: pointer;
		width: 33%;
		height: 1rem;
	}

	.matchselector .exact {
		background: #68a963;
	}

	.matchselector .partial {
		background: #f0c105;
	}

	.matchselector .missing {
		background: #787c7e;
	}

	.letter.missing {
		background: #787c7e;
		color: white;
	}

	.letter.exact {
		background: #68a963;
		color: white;
	}

	.letter.partial {
		background: #f0c105;
		color: white;
	}

	.responsive-table {
		--width: min(100vw, 800px);
		max-width: var(--width);
		padding: 0;
	}
	.responsive-table li {
		border-radius: 3px;
		padding: 0.5rem 1rem;
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.responsive-table .table-header {
		background-color: #dddddd;
		font-size: 0.7rem;
		letter-spacing: 0.03em;
	}
	.responsive-table .table-row {
		background-color: #ffffff;
		box-shadow: 0px 0px 9px 0px rgba(0, 0, 0, 0.1);
		cursor: pointer;
	}
	.responsive-table .col-1 {
		flex-basis: 20%;
	}
	.responsive-table .col-2 {
		flex-basis: 30%;
	}
	.responsive-table .col-3 {
		flex-basis: 30%;
	}
	@media all and (max-width: 767px) {
		.responsive-table .table-header {
			display: none;
		}
		.responsive-table li {
			display: block;
		}
		.responsive-table .col {
			flex-basis: 100%;
		}
		.responsive-table .col {
			display: flex;
			padding: 10px 0;
		}
		.responsive-table .col:before {
			color: #6c7a89;
			padding-right: 10px;
			content: attr(data-label);
			flex-basis: 50%;
			text-align: right;
		}
	}
</style>
