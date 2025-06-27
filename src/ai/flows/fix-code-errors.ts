// src/ai/flows/fix-code-errors.ts
'use server';

/**
 * @fileOverview AI-powered code error identification and correction flow.
 *
 * - fixCodeErrors - A function that takes code as input, identifies and fixes errors, and returns the corrected code.
 * - FixCodeErrorsInput - The input type for the fixCodeErrors function.
 * - FixCodeErrorsOutput - The return type for the fixCodeErrors function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FixCodeErrorsInputSchema = z.object({
  code: z.string().describe('The code snippet to be analyzed and fixed.'),
  language: z.string().optional().describe('The programming language of the code snippet. Example: javascript, python, etc.'),
});
export type FixCodeErrorsInput = z.infer<typeof FixCodeErrorsInputSchema>;

const FixCodeErrorsOutputSchema = z.object({
  correctedCode: z.string().describe('The corrected code snippet, with errors fixed.'),
  explanation: z.string().optional().describe('Explanation of the errors found and how they were fixed. Only include if the model had to fix code.'),
});
export type FixCodeErrorsOutput = z.infer<typeof FixCodeErrorsOutputSchema>;

export async function fixCodeErrors(input: FixCodeErrorsInput): Promise<FixCodeErrorsOutput> {
  return fixCodeErrorsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fixCodeErrorsPrompt',
  input: {schema: FixCodeErrorsInputSchema},
  output: {schema: FixCodeErrorsOutputSchema},
  prompt: `You are an AI code assistant that helps identify and fix errors in code snippets.

  Analyze the following code, identify any errors, and provide a corrected version of the code.
  If there are errors, also include a brief explanation of the errors found and how they were fixed. If no errors are found, return the original code and omit the explanation.

  Language: {{language}}
  Code:
  {{code}}`,
});

const fixCodeErrorsFlow = ai.defineFlow(
  {
    name: 'fixCodeErrorsFlow',
    inputSchema: FixCodeErrorsInputSchema,
    outputSchema: FixCodeErrorsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);



