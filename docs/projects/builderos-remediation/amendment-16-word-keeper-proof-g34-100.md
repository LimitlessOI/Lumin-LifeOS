// src/data/models/Word.ts
export interface Word {
  id: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// src/data/schemas/wordSchema.ts
import { z } from 'zod';

export const wordSchema = z.object({
  id: z.string().uuid(),
  value: z.string().min(1, "Word value cannot be empty"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WordSchema = z.infer<typeof wordSchema>;

// src/data/repositories/IWordRepository.ts
import { Word } from '../models/Word';

export interface IWordRepository {
  save(word: Word): Promise<Word>;
  findById(id: string): Promise<Word | null>;
}

// src/data/repositories/WordRepository.ts
import { Word } from '../models/Word';
import { IWordRepository } from './IWordRepository';
import { wordSchema } from '../schemas/wordSchema';

// For the smallest safe build slice, we'll use an in-memory store.
// In a production environment, this would be replaced with a database client.
const inMemoryWordStore = new Map<string, Word>();

export class WordRepository implements IWordRepository {
  async save(word: Word): Promise<Word> {
    // Validate the word against the schema before persistence
    wordSchema.parse(word);

    // Simulate asynchronous database save operation
    const savedWord = { ...word }; // Create a copy to ensure immutability of stored object
    inMemoryWordStore.set(savedWord.id, savedWord);
    return savedWord;
  }

  async findById(id: string): Promise<Word | null> {
    // Simulate asynchronous database fetch operation
    const word = inMemoryWordStore.get(id);
    return word ? { ...word } : null; // Return a copy or null if not found
  }
}