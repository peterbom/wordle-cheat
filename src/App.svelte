<script lang="ts">
  import { liveQuery } from "dexie";
  import { db } from "./analysis/storage";
  import { allowedAnswers } from "./analysis/words";
  import {
    MatchLevel,
    getLetterDistribution,
    getMatchLevelAtIndex,
    getSortedGuessStats,
    type GuessStats,
  } from "./analysis/stats";
  import { setMatchLevel, createGame, setGuess, getNextWord } from "./game";

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

  function handleMatchLevelSelect(column: number, matchLevel: MatchLevel) {
    game = game && setMatchLevel(game, column, matchLevel);
  }

  function handleGuessClick(guess: string) {
    game = game && setGuess(game, guess);
  }

  function handleGetNextWord() {
    game = game && getNextWord(game);
  }
</script>

<main>
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
                  on:click={() =>
                    handleMatchLevelSelect(column, MatchLevel.None)}
                />
                <button
                  class="partial"
                  on:click={() =>
                    handleMatchLevelSelect(column, MatchLevel.Partial)}
                />
                <button
                  class="exact"
                  on:click={() =>
                    handleMatchLevelSelect(column, MatchLevel.Exact)}
                />
              </div>
            {/each}
          {/if}
        </div>
      {/each}
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
        <li
          class="table-row selectable"
          on:click={() => handleGuessClick(guess.guess)}
        >
          <div class="col col-1">{guess.guess}</div>
          <div class="col col-2">{guess.avg.toFixed(2)}</div>
          <div class="col col-3">{guess.stdDev.toFixed(2)}</div>
        </li>
      {/each}
    </ul>
    {#if lastTurn.possibleAnswers.length < 20}
      <ul class="item-list">
        <li class="table-header">
          <div class="col col-1">Possible Answer</div>
          <div class="col col-2">Expected words remaining</div>
          <div class="col col-3">
            Standard deviation of remaining word counts
          </div>
        </li>
        {#each lastTurn.possibleAnswers as answer}
          {@const stats = lastTurn.lookup.get(answer)}
          {#if stats}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <li
              class="table-row selectable"
              on:click={() => handleGuessClick(answer)}
            >
              <div class="col col-1">{answer}</div>
              <div class="col col-2">{stats.avg.toFixed(2)}</div>
              <div class="col col-3">{stats.stdDev.toFixed(2)}</div>
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
  {/if}
</main>
