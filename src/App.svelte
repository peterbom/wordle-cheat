<script lang="ts">
  import { liveQuery } from "dexie";
  import { db } from "./analysis/storage";
  import { allowedAnswers } from "./analysis/words";
  import {
    MatchLevel,
    getLetterDistribution,
    getMatchLevelAtIndex,
    getSortedGuessStats,
    type Pattern,
    getWord,
    getMatchingPatterns,
  } from "./analysis/stats";
  import {
    createGame,
    deleteLastTurn,
    setGuess,
    setLastTurnPattern,
    setNextWord,
    togglePartialPattern,
  } from "./game";

  $: allGuessStats = liveQuery(async () => {
    let guessesData = await db.data.get("guesses");
    if (!guessesData) {
      const allowedAnswerDistribs = allowedAnswers.map(getLetterDistribution);
      guessesData = {
        id: "guesses",
        value: getSortedGuessStats(allowedAnswerDistribs),
      };
      await db.data.add(guessesData);
    }

    return guessesData?.value || [];
  });

  $: guessCount = 20;
  $: game = createGame($allGuessStats, allowedAnswers);

  function handleGuessClick(guess: string) {
    game = game && setGuess(game, guess);
  }

  function handleLetterClick(current: boolean, index: number) {
    game = game && current ? togglePartialPattern(game, index) : game;
  }

  function handleNextWord() {
    game = game && setNextWord(game);
  }

  function handlePatternSelect(pattern: Pattern) {
    game = game && setLastTurnPattern(game, pattern);
  }

  function handleDeleteTurn() {
    game = game && deleteLastTurn(game);
  }
</script>

<main>
  {#if !game}
    <h2>Loading...</h2>
  {:else}
    {@const lastTurn = game.turns[game.turns.length - 1]}
    {@const isComplete = lastTurn.possibleAnswerStats.length <= 1}
    {@const guessStats = lastTurn.allGuessStats.slice(0, guessCount)}
    <div class="grid">
      {#each Array.from(Array(game.turns.length).keys()) as turnIndex (turnIndex)}
        {@const current = turnIndex === game.turns.length - 1}
        {@const turn = game.turns[turnIndex]}
        <div class="row" class:current>
          {#each Array.from(Array(5).keys()) as column (column)}
            {@const value = turn.guessStats.guess[column]}
            {@const matchLevel =
              turn.pattern !== null
                ? getMatchLevelAtIndex(turn.pattern, column)
                : turn.partialPattern[column]}
            {@const autofilled = current && turn.partialPattern[column] === null}
            {@const exact = matchLevel === MatchLevel.Exact}
            {@const partial = matchLevel === MatchLevel.Partial}
            {@const missing = matchLevel === MatchLevel.None}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="letter"
              class:exact
              class:partial
              class:missing
              class:current
              class:autofilled
              on:click={() => handleLetterClick(current, column)}
            >
              {value}
            </div>
          {/each}
          {#if current}
            {#if lastTurn.pattern !== null && !isComplete}
              <button on:click={handleNextWord}>Next word</button>
            {:else if turnIndex > 0}
              <button on:click={handleDeleteTurn}>Delete</button>
            {/if}
          {/if}
        </div>
      {/each}

      <details>
        <summary>Patterns</summary>
        {#each getMatchingPatterns(lastTurn.possiblePatterns, lastTurn.partialPattern) as pattern}
          {@const patternDistribs = lastTurn.guessStats.patternAnswerDistribs.get(pattern)}
          {@const patternWords = patternDistribs ? patternDistribs.map(getWord) : []}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="row" on:click={() => handlePatternSelect(pattern)}>
            {#each Array.from(Array(5).keys()) as column (column)}
              {@const matchLevel = getMatchLevelAtIndex(pattern, column)}
              {@const exact = matchLevel === MatchLevel.Exact}
              {@const partial = matchLevel === MatchLevel.Partial}
              {@const missing = matchLevel === MatchLevel.None}
              <div class="matchselector" class:exact class:partial class:missing>&nbsp;</div>
            {/each}
            <div title={patternWords.join("\n")}>{patternWords.length}</div>
          </div>
        {/each}
      </details>
    </div>
    <ul class="item-list">
      <li class="table-header">
        <div class="col col-1">Guess</div>
        <div class="col col-2">Expected words remaining</div>
        <div class="col col-3">Standard deviation of remaining word counts</div>
      </li>
      {#each guessStats as guess}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <li class="table-row selectable" on:click={() => handleGuessClick(guess.guess)}>
          <div class="col col-1">{guess.guess}</div>
          <div class="col col-2">{guess.avg.toFixed(2)}</div>
          <div class="col col-3">{guess.stdDev.toFixed(2)}</div>
        </li>
      {/each}
    </ul>
    {#if lastTurn.possibleAnswerStats.length < 20}
      <ul class="item-list">
        <li class="table-header">
          <div class="col col-1">Possible Answer</div>
          <div class="col col-2">Expected words remaining</div>
          <div class="col col-3">Standard deviation of remaining word counts</div>
        </li>
        {#each lastTurn.possibleAnswerStats as stats}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li class="table-row selectable" on:click={() => handleGuessClick(stats.guess)}>
            <div class="col col-1">{stats.guess}</div>
            <div class="col col-2">{stats.avg.toFixed(2)}</div>
            <div class="col col-3">{stats.stdDev.toFixed(2)}</div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</main>
