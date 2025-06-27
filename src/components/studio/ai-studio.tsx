"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import type { editor } from 'monaco-editor';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { cn } from '@/lib/utils';
import { runJavascript } from '@/lib/code-runner';
import { explainCode } from '@/ai/flows/explain-code';
import { fixCodeErrors } from '@/ai/flows/fix-code-errors';
import { autoCompleteCode } from '@/ai/flows/auto-complete-code';
import { chatWithCode } from '@/ai/flows/chat-with-code';

import {
  Play,
  Sparkles,
  Wand2,
  Bot,
  Loader2,
  ChevronUp,
  ChevronDown,
  Terminal,
  Zap,
  User,
  Send,
  Trash2,
  FileCode2,
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
type ChatMessage = {
  role: 'user' | 'ai';
  content: string;
};

const defaultCode: Record<Language, string> = {
  javascript: `// Welcome to AI Studio!
// You can write and execute JavaScript code.
// Use the AI tools in the panel on the right to boost your productivity.

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

const initialChatMessages: ChatMessage[] = [
    {
        role: 'ai',
        content: "Hello! I'm your AI assistant. How can I help you with your code today? You can ask me to explain, fix, or even write code for you.",
    }
]

export function AIStudio() {
  const [code, setCode] = useState<string>(defaultCode.javascript);
  const [language, setLanguage] = useState<Language>('javascript');
  const [output, setOutput] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [chatInput, setChatInput] = useState<string>('');
  const [isOutputVisible, setIsOutputVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
    setCode(defaultCode[value]);
    setOutput([]);
    setChatMessages(initialChatMessages);
  };

  const handleRunCode = async () => {
    if (language !== 'javascript') {
      setOutput(['Python execution is not supported in this version.']);
      return;
    }
    setIsLoading(true);
    setOutput(['Executing...']);
    const result = await runJavascript(code);
    setOutput(result);
    setIsLoading(false);
  };
  
  const handleExplain = async () => {
    if (!editorRef.current) return;
    const selection = editorRef.current.getSelection();
    const selectedCode = selection ? editorRef.current.getModel()?.getValueInRange(selection) : code;
    
    if (!selectedCode?.trim()) {
      toast({ title: 'No code selected', description: 'Please select a code snippet to explain.' });
      return;
    }
    
    setIsLoading(true);
    setChatMessages(prev => [...prev, {role: 'user', content: `Explain this code:\n\`\`\`${language}\n${selectedCode}\n\`\`\``}]);

    try {
      const result = await explainCode({ code: selectedCode, language });
      setChatMessages(prev => [...prev, {role: 'ai', content: result.explanation}]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to explain code.' });
      setChatMessages(prev => [...prev, {role: 'ai', content: 'Sorry, I encountered an error trying to explain the code.'}]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFixErrors = async () => {
    if (!editorRef.current) return;
    setIsLoading(true);
    setChatMessages(prev => [...prev, {role: 'user', content: 'Fix the errors in the current code.'}]);
    
    try {
      const result = await fixCodeErrors({ code, language });
      setCode(result.correctedCode);
      const response = result.explanation ? result.explanation : 'No errors found. The code seems correct.';
      setChatMessages(prev => [...prev, {role: 'ai', content: response}]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fix code.' });
       setChatMessages(prev => [...prev, {role: 'ai', content: 'Sorry, I could not fix the errors.'}]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoComplete = async () => {
    if (!editorRef.current) return;
    setIsLoading(true);
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
     
      toast({ title: 'Success', description: 'Code completion applied.' });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate completion.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;

    const newQuery = chatInput;
    setChatInput('');
    setIsLoading(true);
    setChatMessages(prev => [...prev, {role: 'user', content: newQuery}]);

    try {
        const result = await chatWithCode({ code, language, query: newQuery });
        setChatMessages(prev => [...prev, {role: 'ai', content: result.response}]);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to get a response.' });
        setChatMessages(prev => [...prev, {role: 'ai', content: 'Sorry, I encountered an error.'}]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans">
      {/* Left Sidebar */}
      <div className="hidden w-64 border-r bg-card md:flex md:flex-col shrink-0">
        <header className="flex h-14 items-center border-b px-4">
          <h2 className="font-semibold text-lg tracking-tight">Explorer</h2>
        </header>
        <ScrollArea className="flex-1">
          <nav className="grid gap-1 p-2">
            <button
              onClick={() => handleLanguageChange('javascript')}
              className={cn(
                'flex items-center gap-2 rounded-md p-2 text-sm font-medium w-full text-left',
                language === 'javascript'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <FileCode2 className="h-4 w-4" />
              <span>script.js</span>
            </button>
            <button
              onClick={() => handleLanguageChange('python')}
              className={cn(
                'flex items-center gap-2 rounded-md p-2 text-sm font-medium w-full text-left',
                language === 'python'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <FileCode2 className="h-4 w-4" />
              <span>script.py</span>
            </button>
          </nav>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b px-4 gap-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Bot className="h-6 w-6 text-primary" />
                    <h1 className="text-lg font-semibold tracking-tight">AI Studio</h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button onClick={handleRunCode} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run
                </Button>
            </div>
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

      {/* Sidebar */}
      <aside className="w-96 border-l bg-card flex flex-col shrink-0">
        <header className="p-4 border-b flex items-center justify-between h-14">
            <h1 className="text-lg font-semibold tracking-tight">AI Assistant</h1>
            <Button variant="ghost" size="icon" onClick={() => setChatMessages(initialChatMessages)} disabled={isLoading}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Clear Chat</span>
            </Button>
        </header>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
            {chatMessages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`rounded-lg p-3 text-sm max-w-[80%] break-words ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <ReactMarkdown 
                    className="prose prose-sm dark:prose-invert prose-p:my-0 prose-headings:my-1"
                    remarkPlugins={[remarkGfm]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t bg-background/50">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Button onClick={handleExplain} disabled={isLoading} size="sm" variant="outline" className="flex-1">
                <Sparkles className="mr-2 h-4 w-4" /> Explain
              </Button>
              <Button onClick={handleFixErrors} disabled={isLoading} size="sm" variant="outline" className="flex-1">
                <Wand2 className="mr-2 h-4 w-4" /> Fix
              </Button>
              <Button onClick={handleAutoComplete} disabled={isLoading} size="sm" variant="outline" className="flex-1">
                <Zap className="mr-2 h-4 w-4" /> Complete
              </Button>
            </div>
            <form onSubmit={handleChatSubmit} className="flex items-start gap-2">
              <Textarea 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask a question or give an instruction..."
                className="min-h-[60px] max-h-48 resize-y text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit(e as any);
                  }
                }}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !chatInput.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
