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

export const ChatWithCodeInputSchema = z.object({
  code: z.string().describe('The code snippet the user is asking about.'),
  language: z.string().describe('The programming language of the code snippet.'),
  query: z.string().describe('The user\'s question or prompt.'),
});
export type ChatWithCodeInput = z.infer<typeof ChatWithCodeInputSchema>;

export const ChatWithCodeOutputSchema = z.object({
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
  prompt: `You are an expert AI programming assistant. A user is asking for help with the following code.

Language: {{{language}}}

Code:
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
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
