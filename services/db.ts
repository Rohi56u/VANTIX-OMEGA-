import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MemoryEntry, Task, SystemLog } from '../types';

interface OmegaDB extends DBSchema {
  memories: {
    key: string;
    value: MemoryEntry;
    indexes: { 'by-type': string; 'by-timestamp': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-status': string };
  };
  logs: {
    key: string;
    value: SystemLog;
    indexes: { 'by-timestamp': string };
  };
}

const DB_NAME = 'vantix-omega-core';
const DB_VERSION = 2; // Bump version for schema change

// Vector Math Utils
const dotProduct = (a: number[], b: number[]) => {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
};

const magnitude = (v: number[]) => {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
};

const cosineSimilarity = (a: number[], b: number[]) => {
  if (!a || !b || a.length !== b.length) return 0;
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
};

class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<OmegaDB>>;

  constructor() {
    this.dbPromise = openDB<OmegaDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Migration logic if needed
        if (oldVersion < 1) {
           const memStore = db.createObjectStore('memories', { keyPath: 'id' });
           memStore.createIndex('by-type', 'type');
           memStore.createIndex('by-timestamp', 'timestamp');
           const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
           taskStore.createIndex('by-status', 'status');
           const logStore = db.createObjectStore('logs', { keyPath: 'id' });
           logStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  async addMemory(entry: MemoryEntry): Promise<void> {
    const db = await this.dbPromise;
    await db.put('memories', entry);
  }

  async getMemories(): Promise<MemoryEntry[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('memories', 'by-timestamp');
  }

  // SEMANTIC VECTOR SEARCH
  async searchMemoriesVector(embedding: number[], threshold = 0.6): Promise<MemoryEntry[]> {
    const db = await this.dbPromise;
    const allMemories = await db.getAll('memories');
    
    if (!embedding || embedding.length === 0) {
        // Fallback to time-based
        return allMemories.slice(0, 10); 
    }

    // Calculate similarity for all memories containing embeddings
    const scored = allMemories
      .filter(m => m.embedding && m.embedding.length > 0)
      .map(m => ({
        memory: m,
        score: cosineSimilarity(embedding, m.embedding!)
      }))
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score);

    return scored.map(item => item.memory);
  }

  async searchMemories(query: string): Promise<MemoryEntry[]> {
    const db = await this.dbPromise;
    const all = await db.getAll('memories');
    // Hybrid Fallback: Keyword search
    const lowerQ = query.toLowerCase();
    return all.filter(m => 
      m.content.toLowerCase().includes(lowerQ) || 
      m.tags.some(t => t.toLowerCase().includes(lowerQ))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async addTask(task: Task): Promise<void> {
    const db = await this.dbPromise;
    await db.put('tasks', task);
  }

  async updateTask(task: Task): Promise<void> {
    const db = await this.dbPromise;
    await db.put('tasks', task);
  }

  async getTasks(): Promise<Task[]> {
    const db = await this.dbPromise;
    return db.getAll('tasks');
  }

  async addLog(log: SystemLog): Promise<void> {
    const db = await this.dbPromise;
    await db.put('logs', log);
  }

  async getLogs(limit = 100): Promise<SystemLog[]> {
    const db = await this.dbPromise;
    const all = await db.getAllFromIndex('logs', 'by-timestamp');
    return all.reverse().slice(0, limit);
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('memories');
    await db.clear('tasks');
    await db.clear('logs');
  }
}

export const db = new DatabaseService();