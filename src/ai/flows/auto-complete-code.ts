// src/ai/flows/auto-complete-code.ts
'use server';

/**
 * @fileOverview Provides AI-powered code auto-completion suggestions.
 *
 * - autoCompleteCode - A function that suggests code blocks based on the given code snippet.
 * - AutoCompleteCodeInput - The input type for the autoCompleteCode function.
 * - AutoCompleteCodeOutput - The return type for the autoCompleteCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutoCompleteCodeInputSchema = z.object({
  codeSnippet: z
    .string()
    .describe('The code snippet for which auto-completion is requested.'),
  language: z.string().optional().describe('The programming language of the code snippet.'),
});
export type AutoCompleteCodeInput = z.infer<typeof AutoCompleteCodeInputSchema>;

const AutoCompleteCodeOutputSchema = z.object({
  completedCode: z
    .string()
    .describe('The AI-powered auto-completed code suggestion.'),
});
export type AutoCompleteCodeOutput = z.infer<typeof AutoCompleteCodeOutputSchema>;

export async function autoCompleteCode(input: AutoCompleteCodeInput): Promise<AutoCompleteCodeOutput> {
  return autoCompleteCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoCompleteCodePrompt',
  input: {schema: AutoCompleteCodeInputSchema},
  output: {schema: AutoCompleteCodeOutputSchema},
  prompt: `You are an AI code completion assistant. You will receive a code snippet and your task is to suggest the most likely code that should follow, completing the snippet.

  The code is written in the language: {{{language}}}

  Here is the code snippet:
  {{codeSnippet}}

  Please provide only the completed code, without any additional explanations or comments.
  `,
});

const autoCompleteCodeFlow = ai.defineFlow(
  {
    name: 'autoCompleteCodeFlow',
    inputSchema: AutoCompleteCodeInputSchema,
    outputSchema: AutoCompleteCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
