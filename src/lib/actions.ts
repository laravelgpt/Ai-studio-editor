'use server';

import { 
    listFiles as listDbFiles, 
    readFile as readDbFile, 
    saveFile as saveDbFile, 
    createFolder as createDbFolder, 
    deletePath as deleteDbPath 
} from '@/lib/mock-db';

export async function listFiles(): Promise<string[]> {
    return listDbFiles();
}

export async function readFile(path: string): Promise<string | null> {
    return readDbFile(path) ?? null;
}

export async function saveFile(path: string, content: string): Promise<void> {
    saveDbFile(path, content);
}

export async function createFolder(path: string): Promise<void> {
    createDbFolder(path);
}

export async function deletePath(path: string): Promise<void> {
    deleteDbPath(path);
}
