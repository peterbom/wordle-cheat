<script lang="ts">
  import statsCache from "../gen/statsCache.json";
  import { allowedAnswers } from "../build/words";
  import {
    MatchLevel,
    getAnswersWithPattern,
    getMatchLevelAtIndex,
    type Pattern,
    getWord,
    getMatchingPatterns,
    fromStorable,
    getLetterDistribution,
    type GuessStats,
  } from "./analysis/stats";
  import {
    createGame,
    deleteLastTurn,
    setGuess,
    setLastTurnPattern,
    setNextWord,
    togglePartialPattern,
    type Game,
  } from "./game";

  const allGuessStats = fromStorable(statsCache);

  $: errorMessage = "";
  $: guessCount = 20;
  $: game = createGame(allGuessStats, allowedAnswers);
  $: isUpdating = false;

  $: lastTurn = game.turns[game.turns.length - 1];
  $: possibleAnswers = lastTurn.possibleAnswerStats.map((s) => s.guess);
  $: isComplete = lastTurn.possibleAnswerStats.length <= 1;
  $: guessFilterString = "";
  $: guessFilterPossibleOnly = false;
  $: matchesFilter = (stats: GuessStats) => {
    if (guessFilterString && !stats.guess.includes(guessFilterString)) return false;
    if (guessFilterPossibleOnly && !stats.isPossibleAnswer) return false;
    return true;
  };
  $: guessStats = lastTurn.allGuessStats.filter(matchesFilter).slice(0, guessCount);

  function updateGame(updater: (game: Game) => Game) {
    if (!game) return;
    if (isUpdating) return;
    isUpdating = true;
    errorMessage = "";
    const gameToUpdate = game;
    setTimeout(() => {
      try {
        game = updater(gameToUpdate);
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : String(e);
      } finally {
        isUpdating = false;
      }
    }, 10);
  }

  function handleGuessClick(guess: string) {
    updateGame((game) => setGuess(game, guess));
  }

  function handleLetterClick(current: boolean, index: number) {
    if (!current) return;
    updateGame((game) => togglePartialPattern(game, index));
  }

  function handleNextWord() {
    updateGame((game) => setNextWord(game));
    guessFilterString = "";
    guessFilterPossibleOnly = false;
  }

  function handlePatternSelect(pattern: Pattern) {
    updateGame((game) => setLastTurnPattern(game, pattern));
  }

  function handleDeleteTurn() {
    updateGame((game) => deleteLastTurn(game));
  }
</script>

<main>
  {#if errorMessage}
    <h2>Error: {errorMessage}</h2>
  {/if}
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
            <button disabled={isUpdating} on:click={handleNextWord}>Next word</button>
          {:else if turnIndex > 0}
            <button disabled={isUpdating} on:click={handleDeleteTurn}>Delete</button>
          {/if}
        {/if}
      </div>
    {/each}

    <details>
      <summary>Patterns</summary>
      {#each getMatchingPatterns(lastTurn.possiblePatterns, lastTurn.partialPattern) as pattern}
        {@const patternDistribs = getAnswersWithPattern(
          lastTurn.guessStats.guess,
          possibleAnswers.map(getLetterDistribution),
          pattern,
        )}
        {@const patternWords = patternDistribs.map(getWord)}
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
  <h3 title={possibleAnswers.join("\n")}>
    Remaining answers: {possibleAnswers.length}
  </h3>
  <details>
    <summary>Filter guesses</summary>
    <label>
      Name
      <input type="text" bind:value={guessFilterString} />
    </label>
    <label>
      Possible
      <input type="checkbox" bind:value={guessFilterPossibleOnly} />
    </label>
  </details>
  <ul class="item-list">
    <li class="table-header">
      <div class="col col-1">Guess</div>
      <div class="col col-1">Rank</div>
      <div class="col col-3">Expected words remaining</div>
    </li>
    {#each guessStats as guess}
      {@const impossible = !guess.isPossibleAnswer}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <li
        class="table-row selectable"
        class:impossible
        on:click={() => handleGuessClick(guess.guess)}
      >
        <div class="col col-1">{guess.guess}</div>
        <div class="col col-1">{guess.rank}</div>
        <div class="col col-3">{guess.avg.toFixed(2)}</div>
      </li>
    {/each}
  </ul>
</main>
