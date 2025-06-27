'use server';

/**
 * @fileOverview Provides a general purpose chat interface for code-related questions.
 *
 * - chatWithCode - A function that responds to user queries about a code snippet.
 * - ChatWithCodeInput - The input type for the chatWithCode function.
 * - ChatWithCodeOutput - The return type for the chatWithCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { saveFileTool, readFileTool, listFilesTool, createFolderTool, deleteFileTool, deleteFolderTool } from '@/ai/tools/database-tools';

const ChatWithCodeInputSchema = z.object({
  code: z.string().describe('The code snippet the user is asking about. This is the code currently open in the editor.'),
  language: z.string().describe('The programming language of the code snippet.'),
  query: z.string().describe('The user\'s question or prompt.'),
});
export type ChatWithCodeInput = z.infer<typeof ChatWithCodeInputSchema>;

const ChatWithCodeOutputSchema = z.object({
  response: z.string().describe('The AI\'s response to the user\'s query.'),
});
export type ChatWithCodeOutput = z.infer<typeof ChatWithCodeOutputSchema>;

export async function chatWithCode(input: ChatWithCodeInput): Promise<ChatWithCodeOutput> {
  return chatWithCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithCodePrompt',
  input: {schema: ChatWithCodeInputSchema},
  output: {schema: ChatWithCodeOutputSchema},
  tools: [saveFileTool, readFileTool, listFilesTool, createFolderTool, deleteFileTool, deleteFolderTool],
  prompt: `You are an expert AI programming assistant. A user is asking for help with the following code.

You have access to a virtual file system. You can create, read, update, and delete files and folders.
Use the provided tools to manage the file system when the user asks for it. For example, if the user asks "create a new folder called 'styles'", use the createFolder tool with the path 'styles/'.
When saving a file, use the 'code' from the input as the content, unless the user specifies otherwise. Folder paths MUST end with a '/'.

Language: {{{language}}}

Code in the editor (path: {{{activeFile}}}):
\`\`\`{{{language}}}
{{{code}}}
\`\`\`

User's query: "{{{query}}}"

Provide a helpful and concise response. If the query involves generating code, provide the code snippet in a markdown block.
`,
});

const chatWithCodeFlow = ai.defineFlow(
  {
    name: 'chatWithCodeFlow',
    inputSchema: ChatWithCodeInputSchema,
    outputSchema: ChatWithCodeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
