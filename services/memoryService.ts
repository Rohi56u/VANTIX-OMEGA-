import { MemoryEntry, AgentType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { getEmbeddings } from './geminiService';

export const MemoryService = {
  // Store a new memory entry persistently with Vector Embedding
  addMemory: async (
    content: string, 
    type: 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL', 
    agentOrigin: AgentType,
    tags: string[] = []
  ): Promise<MemoryEntry> => {
    
    // Generate Vector
    let embedding: number[] = [];
    try {
        embedding = await getEmbeddings(content);
    } catch (e) {
        console.warn("Failed to generate embedding for memory:", e);
    }

    const newEntry: MemoryEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      content,
      type,
      agentOrigin,
      tags,
      encryptionLevel: 'AES-256',
      embedding
    };

    await db.addMemory(newEntry);
    return newEntry;
  },

  // Retrieve memories via Hybrid Vector/Keyword Search
  search: async (query: string): Promise<MemoryEntry[]> => {
    // 1. Try Vector Search First
    try {
        const queryVector = await getEmbeddings(query);
        const vectorResults = await db.searchMemoriesVector(queryVector, 0.65);
        if (vectorResults.length > 0) return vectorResults;
    } catch (e) {
        console.warn("Vector search failed, falling back to keyword.", e);
    }

    // 2. Fallback to Keyword
    return await db.searchMemories(query);
  },

  getAll: async (): Promise<MemoryEntry[]> => {
    return (await db.getMemories()).reverse(); // Newest first
  },

  clearMemory: async () => {
    await db.clearAll();
  }
};