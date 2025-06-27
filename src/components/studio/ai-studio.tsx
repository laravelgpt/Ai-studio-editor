"use client";

import { useState, useRef, useCallback } from 'react';
import type { editor } from 'monaco-editor';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { runJavascript } from '@/lib/code-runner';
import { explainCode } from '@/ai/flows/explain-code';
import { fixCodeErrors } from '@/ai/flows/fix-code-errors';
import { autoCompleteCode } from '@/ai/flows/auto-complete-code';

import {
  Play,
  Sparkles,
  Wand2,
  Bot,
  Loader2,
  ChevronUp,
  ChevronDown,
  Terminal,
  CloudCog,
  Zap,
} from 'lucide-react';

const DynamicEditor = dynamic(
  () => import('@/components/studio/code-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

type Language = 'javascript' | 'python';
type LoadingStates = {
  explain?: boolean;
  fix?: boolean;
  autocomplete?: boolean;
  run?: boolean;
};

const defaultCode: Record<Language, string> = {
  javascript: `// Welcome to AI Studio!
// You can write and execute JavaScript code.
// Use the AI tools in the left sidebar to boost your productivity.

function factorial(n) {
  if (n === 0) {
    return 1;
  }
  return n * factorial(n - 1);
}

const num = 5;
console.log(\`The factorial of \${num} is \${factorial(num)}\`);

// Try selecting a piece of code and clicking "Explain"
// Or introduce an error and click "Fix"
`,
  python: `# Welcome to AI Studio!
# Python execution is not yet supported in the browser.

def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        print(a, end=' ')
        a, b = b, a + b

fibonacci(10)
`,
};

export function AIStudio() {
  const [code, setCode] = useState<string>(defaultCode.javascript);
  const [language, setLanguage] = useState<Language>('javascript');
  const [output, setOutput] = useState<string[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  const [isOutputVisible, setIsOutputVisible] = useState(true);
  const [loading, setLoading] = useState<LoadingStates>({});

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  const { toast } = useToast();

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
    setCode(defaultCode[value]);
    setOutput([]);
    setExplanation('');
  };

  const handleRunCode = async () => {
    if (language !== 'javascript') {
      setOutput(['Python execution is not supported in this version.']);
      return;
    }
    setLoading({ run: true });
    setOutput(['Executing...']);
    const result = await runJavascript(code);
    setOutput(result);
    setLoading({ run: false });
  };
  
  const handleExplain = async () => {
    if (!editorRef.current) return;
    const selection = editorRef.current.getSelection();
    const selectedCode = selection ? editorRef.current.getModel()?.getValueInRange(selection) : code;
    
    if (!selectedCode?.trim()) {
      toast({ title: 'No code selected', description: 'Please select a code snippet to explain.' });
      return;
    }
    
    setLoading({ explain: true });
    setExplanation('Analyzing code...');
    try {
      const result = await explainCode({ code: selectedCode, language });
      setExplanation(result.explanation);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to explain code.' });
      setExplanation('Could not get an explanation.');
    } finally {
      setLoading({});
    }
  };
  
  const handleFixErrors = async () => {
    if (!editorRef.current) return;
    setLoading({ fix: true });
    setExplanation('Fixing errors...');
    try {
      const result = await fixCodeErrors({ code, language });
      setCode(result.correctedCode);
      if (result.explanation) {
        setExplanation(result.explanation);
      } else {
        setExplanation('No errors found.');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fix code.' });
       setExplanation('Could not fix errors.');
    } finally {
      setLoading({});
    }
  };

  const handleAutoComplete = async () => {
    if (!editorRef.current) return;
    setLoading({ autocomplete: true });
    setExplanation('Generating completion...');
    try {
      const result = await autoCompleteCode({ codeSnippet: code, language });
      const currentPosition = editorRef.current.getPosition();
      if(currentPosition){
         editorRef.current.executeEdits('ai-autocomplete', [{
          range: new editor.Range(currentPosition.lineNumber, currentPosition.column, currentPosition.lineNumber, currentPosition.column),
          text: result.completedCode
        }]);
      } else {
         setCode(code + result.completedCode);
      }
     
      setExplanation('Code completion applied.');
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate completion.' });
       setExplanation('Could not generate completion.');
    } finally {
      setLoading({});
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen w-screen bg-background text-foreground font-sans">
        {/* Sidebar */}
        <aside className="flex flex-col w-72 border-r bg-card p-4 gap-4">
          <header className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">AI Studio</h1>
          </header>
          <Separator />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">Language</label>
            <Select onValueChange={handleLanguageChange} value={language}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">AI Tools</h2>
            <Button onClick={handleExplain} disabled={!!loading.explain || !!loading.fix} className="justify-start">
              {loading.explain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Explain Code
            </Button>
            <Button onClick={handleFixErrors} disabled={!!loading.fix || !!loading.explain} className="justify-start">
               {loading.fix ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Fix Errors
            </Button>
            <Button onClick={handleAutoComplete} disabled={!!loading.autocomplete} className="justify-start">
              {loading.autocomplete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Auto-Complete
            </Button>
          </div>
          <Separator />
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="p-4">
              <CardTitle className="text-base">AI Assistant</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 h-full">
              <ScrollArea className="h-full pr-3">
                <p className="text-sm whitespace-pre-wrap font-code">
                  {explanation || 'Select an AI tool to get started.'}
                </p>
              </ScrollArea>
            </CardContent>
          </Card>
          <div className="mt-auto flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="justify-start" disabled>
                  <CloudCog className="mr-2 h-4 w-4" />
                  Connect to Mcp-server
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Coming Soon!</p>
              </TooltipContent>
            </Tooltip>
            <ThemeToggle />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="flex h-14 items-center justify-end border-b px-4">
            <Button onClick={handleRunCode} disabled={!!loading.run}>
              {loading.run ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run
            </Button>
          </header>

          {/* Editor and Output */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              <DynamicEditor
                language={language}
                value={code}
                onChange={(value) => setCode(value || '')}
                onMount={handleEditorDidMount}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
              />
            </div>
            {isOutputVisible && (
              <div className="h-64 border-t bg-card">
                <header className="flex h-12 items-center justify-between border-b px-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    <h2 className="font-medium">Output</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsOutputVisible(false)}>
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </header>
                <ScrollArea className="h-[calc(16rem-3rem)]">
                  <pre className="p-4 text-sm font-code">{output.join('\n')}</pre>
                </ScrollArea>
              </div>
            )}
            {!isOutputVisible && (
              <header className="flex h-12 items-center justify-between border-t px-4">
                 <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    <h2 className="font-medium">Output</h2>
                  </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOutputVisible(true)}>
                  <ChevronUp className="h-5 w-5" />
                </Button>
              </header>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
