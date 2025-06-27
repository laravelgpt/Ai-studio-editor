'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
    saveFile as saveDbFile, 
    readFile as readDbFile, 
    listFiles as listDbFiles,
    createFolder as createDbFolder,
    deleteFile as deleteDbFile,
    deleteFolder as deleteDbFolder,
} from '@/lib/mock-db';

export const saveFileTool = ai.defineTool(
  {
    name: 'saveFile',
    description: 'Saves or updates content to a file in the virtual file system. Creates parent directories if they do not exist.',
    inputSchema: z.object({
      path: z.string().describe('The path of the file to save. e.g., "src/components/button.js"'),
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
    description: 'Lists all the files and folders in the virtual file system. Folders will have a trailing slash.',
    inputSchema: z.void(),
    outputSchema: z.array(z.string()),
  },
  async () => {
    return listDbFiles();
  }
);

export const createFolderTool = ai.defineTool(
    {
        name: 'createFolder',
        description: 'Creates a new folder in the virtual file system. The path should end with a forward slash.',
        inputSchema: z.object({
            path: z.string().describe('The path of the folder to create. e.g., "src/new-folder/"'),
        }),
        outputSchema: z.void(),
    },
    async ({ path }) => {
        createDbFolder(path);
    }
);

export const deleteFileTool = ai.defineTool(
    {
        name: 'deleteFile',
        description: 'Deletes a file from the virtual file system.',
        inputSchema: z.object({
            path: z.string().describe('The path of the file to delete. e.g., "src/components/button.js"'),
        }),
        outputSchema: z.void(),
    },
    async ({ path }) => {
        deleteDbFile(path);
    }
);

export const deleteFolderTool = ai.defineTool(
    {
        name: 'deleteFolder',
        description: 'Deletes a folder and all of its contents from the virtual file system. The path should end with a forward slash.',
        inputSchema: z.object({
            path: z.string().describe('The path of the folder to delete. e.g., "src/old-folder/"'),
        }),
        outputSchema: z.void(),
    },
    async ({ path }) => {
        deleteDbFolder(path);
    }
);
