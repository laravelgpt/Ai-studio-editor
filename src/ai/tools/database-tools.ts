'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { saveFile as saveDbFile, readFile as readDbFile, listFiles as listDbFiles } from '@/lib/mock-db';

export const saveFileTool = ai.defineTool(
  {
    name: 'saveFile',
    description: 'Saves content to a file in the virtual file system.',
    inputSchema: z.object({
      path: z.string().describe('The path of the file to save.'),
      content: z.string().describe('The content to save to the file.'),
    }),
    outputSchema: z.void(),
  },
  async ({ path, content }) => {
    saveDbFile(path, content);
  }
);

export const readFileTool = ai.defineTool(
  {
    name: 'readFile',
    description: 'Reads the content of a file from the virtual file system.',
    inputSchema: z.object({
      path: z.string().describe('The path of the file to read.'),
    }),
    outputSchema: z.string(),
  },
  async ({ path }) => {
    return readDbFile(path) || `File not found: ${path}`;
  }
);

export const listFilesTool = ai.defineTool(
  {
    name: 'listFiles',
    description: 'Lists all the files in the virtual file system.',
    inputSchema: z.void(),
    outputSchema: z.array(z.string()),
  },
  async () => {
    return listDbFiles();
  }
);
