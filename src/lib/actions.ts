'use server';

import { listFiles as listDbFiles, readFile as readDbFile } from '@/lib/mock-db';

export async function listFiles(): Promise<string[]> {
    return listDbFiles();
}

export async function readFile(path: string): Promise<string | null> {
    return readDbFile(path) ?? null;
}
