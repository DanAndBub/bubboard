import Dexie, { Table } from 'dexie';
import { UsageRecord } from './types';

export class DriftwatchDB extends Dexie {
  usage!: Table<UsageRecord>;
  constructor() {
    super('driftwatch-costs');
    // Version 2: added request_id index during development (v1 was never shipped)
    this.version(2).stores({
      usage: 'id, timestamp, provider, model, task_id, conversation_id, agent_name, request_id',
    });
  }
}

export const db = new DriftwatchDB();
