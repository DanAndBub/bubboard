import Dexie, { Table } from 'dexie';
import { UsageRecord } from './types';

export class DriftwatchDB extends Dexie {
  usage!: Table<UsageRecord>;
  constructor() {
    super('driftwatch-costs');
    this.version(2).stores({
      usage: 'id, timestamp, provider, model, task_id, conversation_id, agent_name, request_id',
    });
  }
}

export const db = new DriftwatchDB();
