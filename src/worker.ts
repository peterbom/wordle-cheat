import { getLetterDistribution, getSortedGuessStats, type GuessStats } from "./analysis/stats";
import { allowedAnswers } from "./analysis/words";
import { setGuess, type Game } from "./game";
import {
  type MessageSchema,
  type MessageToWorker,
  type MessageType,
  type WorkerError,
  type WorkerMessageHandlers,
} from "./workerUtils";

export type GameMessageDefinitions = {
  buildGuessesData: MessageSchema<void, GuessStats[]>;
  setGuess: MessageSchema<{ game: Game; guess: string }, Game>;
};

self.onmessage = (event: MessageEvent<MessageToWorker<GameMessageDefinitions>>) => {
  handleMessage(event.data, event.data.type);
};

function handleMessage<TType extends MessageType<GameMessageDefinitions>>(
  message: MessageToWorker<GameMessageDefinitions>,
  type: TType,
) {
  const messageHandler = handler[type];
  try {
    const result = messageHandler(message.input);
    self.postMessage(result);
  } catch (e) {
    const error: WorkerError = { errorMessage: e instanceof Error ? e.message : String(e) };
    self.postMessage(error);
  }
}

const handler: WorkerMessageHandlers<GameMessageDefinitions> = {
  buildGuessesData,
  setGuess: (args) => setGuess(args.game, args.guess),
};

function buildGuessesData(): GuessStats[] {
  const allowedAnswerDistribs = allowedAnswers.map(getLetterDistribution);
  return getSortedGuessStats(allowedAnswerDistribs);
}
