import { allowedAnswers } from "./words";
import { getLetterDistribution, getSortedGuessStats, toStorable } from "../src/analysis/stats";
import path from "path";
import { writeFileSync } from "fs";

const allowedAnswerDistribs = allowedAnswers.map(getLetterDistribution);
const guessStats = getSortedGuessStats(allowedAnswerDistribs, allowedAnswers);
const storable = toStorable(guessStats, allowedAnswers);

const jsonFilePath = path.join(process.cwd(), "gen", "statsCache.json");
writeFileSync(jsonFilePath, JSON.stringify(storable));
