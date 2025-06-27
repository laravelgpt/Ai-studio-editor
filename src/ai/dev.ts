import { config } from 'dotenv';
config();

import '@/ai/flows/explain-code.ts';
import '@/ai/flows/fix-code-errors.ts';
import '@/ai/flows/auto-complete-code.ts';
import '@/ai/flows/chat-with-code.ts';
import '@/ai/tools/database-tools.ts';
