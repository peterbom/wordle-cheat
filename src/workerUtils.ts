import ViteWorker from "./worker?worker";

export type MessageSchema<TInput, TOutput> = { input: TInput; output: TOutput };

export type MessageDefinitions = {
  [messageType: string]: MessageSchema<unknown, unknown>;
};

export type MessageType<T> = Extract<keyof T, string>;

export type WorkerError = { errorMessage: string };
export function isError(msg: unknown): msg is WorkerError {
  return (msg as WorkerError).errorMessage !== undefined;
}

export type MessageInput<
  TMsgDef extends MessageDefinitions,
  TType extends MessageType<TMsgDef>,
> = TMsgDef[TType]["input"];

export type MessageOutput<
  TMsgDef extends MessageDefinitions,
  TType extends MessageType<TMsgDef>,
> = TMsgDef[TType]["output"];

export type MessageToWorker<TMsgDef extends MessageDefinitions> = {
  [P in MessageType<TMsgDef>]: {
    type: P;
    input: MessageInput<TMsgDef, P>;
  };
}[MessageType<TMsgDef>];

export type WorkerMessageHandler<
  TMsgDef extends MessageDefinitions,
  TType extends MessageType<TMsgDef>,
> = (input: MessageInput<TMsgDef, TType>) => MessageOutput<TMsgDef, TType>;

export type WorkerMessageHandlers<TMsgDef extends MessageDefinitions> = {
  [P in MessageType<TMsgDef>]: WorkerMessageHandler<TMsgDef, P>;
};

export async function getWorkerResult<
  TMsgDef extends MessageDefinitions,
  TType extends MessageType<TMsgDef>,
>(
  type: MessageType<TMsgDef>,
  input: MessageInput<TMsgDef, TType>,
): Promise<MessageOutput<TMsgDef, TType> | WorkerError> {
  return new Promise((resolve) => {
    const worker = new ViteWorker();
    worker.addEventListener(
      "message",
      (msg: MessageEvent<MessageOutput<TMsgDef, TType> | WorkerError>) => {
        resolve(msg.data);
        worker.terminate();
      },
    );

    const message: MessageToWorker<TMsgDef> = { type, input };
    worker.postMessage(message);
  });
}
