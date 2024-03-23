import { allowedAnswers, allowedGuesses } from "./words";
import { getLetterDistribution, getSortedGuessStats, toStorable } from "../src/analysis/stats";
import path from "path";
import { mkdirSync, writeFileSync } from "fs";

const allowedAnswerDistribs = allowedAnswers.map(getLetterDistribution);
const guessStats = getSortedGuessStats(allowedAnswerDistribs, allowedGuesses);
const storable = toStorable(guessStats, allowedAnswers);

const genDir = path.join(process.cwd(), "gen");
mkdirSync(genDir, { recursive: true });
const jsonFilePath = path.join(genDir, "statsCache.json");
writeFileSync(jsonFilePath, JSON.stringify(storable));
