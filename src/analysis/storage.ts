import Dexie, { type Table } from "dexie";
import type { GuessStats } from "./stats";

export type DataItemType = "guesses";

export type DataItem<DataItemType, TValue> = {
  id: DataItemType;
  value: TValue;
};

export type StoredData = DataItem<"guesses", GuessStats[]>;

export class StatsDexie extends Dexie {
  data!: Table<StoredData>;

  constructor() {
    super("statsdb");
    this.version(1).stores({
      data: "&id, value",
    });
  }
}

export const db = new StatsDexie();
