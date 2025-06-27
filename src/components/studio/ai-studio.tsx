
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import type { editor } from 'monaco-editor';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger, MenubarShortcut } from '@/components/ui/menubar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


import { cn } from '@/lib/utils';
import { runJavascript } from '@/lib/code-runner';
import { explainCode } from '@/ai/flows/explain-code';
import { fixCodeErrors } from '@/ai/flows/fix-code-errors';
import { autoCompleteCode } from '@/ai/flows/auto-complete-code';
import { chatWithCode } from '@/ai/flows/chat-with-code';
import { listFiles, readFile, saveFile, createFolder, deletePath, getProjectFiles, importProjectFiles } from '@/lib/actions';

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
  GitBranch,
  Puzzle,
  PanelRight,
  BrainCircuit,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Settings,
  HelpCircle,
  Hammer,
  Search,
  CaseSensitive,
  WholeWord,
  Regex,
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

type ActiveView = 'explorer' | 'search' | 'source-control' | 'extensions' | 'agent' | 'build' | 'settings' | 'help';
type Language = 'javascript' | 'python' | 'typescript' | 'tsx' | 'json' | 'markdown' | 'html' | 'css';

type ChatMessage = {
  role: 'user' | 'ai';
  content: string;
};

const initialChatMessages: ChatMessage[] = [
    {
        role: 'ai',
        content: "Hello! I'm your AI assistant. How can I help you with your code today? You can ask me to explain, fix, or even write code for you.",
    }
]

const getLanguageFromPath = (path: string): Language => {
    if (path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    return 'javascript';
}

const ExplorerPanel = ({ 
    files, 
    activeFile, 
    onFileSelect, 
    onToggleFolder, 
    openFolders,
    onCreateFile,
    onCreateFolder,
    onDelete
}: { 
    files: string[], 
    activeFile: string, 
    onFileSelect: (file: string) => void,
    onToggleFolder: (folder: string) => void,
    openFolders: Set<string>,
    onCreateFile: (path: string) => void,
    onCreateFolder: (path: string) => void,
    onDelete: (path: string) => void,
}) => {
    const renderTree = (paths: string[], level = 0) => {
        return paths.map(path => {
            const isFolder = path.endsWith('/');
            const name = path.split('/').filter(Boolean).pop() || '';
            const indent = level * 16;
            
            if (isFolder) {
                const isOpen = openFolders.has(path);
                const children = files.filter(f => f.startsWith(path) && f !== path && f.substring(path.length).split('/').length === 1);
                
                return (
                    <div key={path}>
                        <div className="group flex items-center gap-2 rounded-md hover:bg-muted/50 w-full text-left">
                            <button
                                onClick={() => onToggleFolder(path)}
                                className='flex-1 flex items-center gap-2 p-2 text-sm font-medium text-muted-foreground hover:text-foreground'
                                style={{ paddingLeft: `${indent + 8}px` }}
                            >
                                {isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                                <span>{name}</span>
                            </button>
                            <button onClick={() => onDelete(path)} className="opacity-0 group-hover:opacity-100 p-1 mr-2 rounded-md hover:bg-destructive/20 text-destructive/80 hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        {isOpen && (
                            <div>
                                {renderTree(children, level + 1)}
                            </div>
                        )}
                    </div>
                );
            }

            return (
                 <div key={path} className="group flex items-center gap-2 rounded-md hover:bg-muted/50 w-full text-left">
                    <button
                        onClick={() => onFileSelect(path)}
                        className={cn(
                            'flex-1 flex items-center gap-2 p-2 text-sm font-medium w-full text-left',
                            activeFile === path
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        style={{ paddingLeft: `${indent + 8}px` }}
                    >
                        <FileCode2 className="h-4 w-4" />
                        <span>{name}</span>
                    </button>
                    <button onClick={() => onDelete(path)} className="opacity-0 group-hover:opacity-100 p-1 mr-2 rounded-md hover:bg-destructive/20 text-destructive/80 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            );
        });
    };

    const rootPaths = files.filter(f => !f.substring(0, f.endsWith('/') ? f.length - 1 : f.length).includes('/'));

    return (
        <>
            <header className="flex h-14 items-center justify-between border-b px-2">
                <h2 className="font-semibold text-lg tracking-tight px-2">Explorer</h2>
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCreateFile('')}>
                                    <FilePlus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>New File</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCreateFolder('')}>
                                    <FolderPlus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>New Folder</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </header>
            <ScrollArea className="flex-1">
                <nav className="p-2">
                    {renderTree(rootPaths)}
                </nav>
            </ScrollArea>
        </>
    );
};

const SearchPanel = () => (
  <>
    <header className="flex h-14 items-center border-b px-4">
      <h2 className="font-semibold text-lg tracking-tight">Search</h2>
    </header>
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <div className="relative">
          <Input placeholder="Search" className="pr-10" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 data-[active=true]:bg-accent">
                            <CaseSensitive className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Match Case</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                           <WholeWord className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Match Whole Word</TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                           <Regex className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Use Regular Expression</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p>No results found.</p>
        </div>
      </div>
    </ScrollArea>
  </>
);

const SourceControlPanel = () => (
  <>
    <header className="flex h-14 items-center border-b px-4">
      <h2 className="font-semibold text-lg tracking-tight">Source Control</h2>
    </header>
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <Textarea placeholder="Commit message..." className="text-sm" />
        <Button className="w-full">Commit</Button>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Changes</h3>
          <div className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50">
            <FileCode2 className="h-4 w-4" />
            <span className="text-sm">script.js</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  </>
);

const ExtensionsPanel = () => (
  <>
    <header className="flex h-14 items-center border-b px-4">
      <h2 className="font-semibold text-lg tracking-tight">Extensions</h2>
    </header>
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <Input placeholder="Search extensions in Marketplace" />
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Popular</h3>
          <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
            <div className="p-2 bg-blue-200 dark:bg-blue-900/50 rounded-md"><Puzzle className="h-6 w-6 text-blue-800 dark:text-blue-300" /></div>
            <div className="flex-1">
              <p className="font-semibold">Prettier - Code formatter</p>
              <p className="text-xs text-muted-foreground">Formats your code automatically.</p>
            </div>
            <Button variant="outline" size="sm">Install</Button>
          </div>
          <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
             <div className="p-2 bg-purple-200 dark:bg-purple-900/50 rounded-md"><Puzzle className="h-6 w-6 text-purple-800 dark:text-purple-300" /></div>
            <div className="flex-1">
              <p className="font-semibold">ESLint</p>
              <p className="text-xs text-muted-foreground">Integrates ESLint into VS Code.</p>
            </div>
            <Button variant="outline" size="sm">Install</Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  </>
);

const BuildPanel = () => (
    <>
      <header className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="font-semibold text-lg tracking-tight">Build & Deploy</h2>
        <Button size="sm">
          <Play className="mr-2 h-4 w-4" />
          Run Build
        </Button>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Status</h3>
              <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                  <span>Ready to build</span>
              </div>
          </div>
          <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Build Output</h3>
              <div className="p-4 bg-muted/50 rounded-md font-code text-xs h-64 overflow-y-auto">
                  <p className="text-foreground">$ npm run build</p>
                  <p>{'>'} next build</p>
                  <br />
                  <p>info  - Creating an optimized production build...</p>
                  <p>info  - Compiled successfully.</p>
                  <p>info  - Collecting page data...</p>
                  <p>info  - Generating static pages...</p>
                  <p>info  - Finalizing page optimization...</p>
                  <br />
                  <p className="text-green-500">Build successful!</p>
              </div>
          </div>
          <Button className="w-full" variant="outline" disabled>Deploy to Production</Button>
        </div>
      </ScrollArea>
    </>
  );

const AgentPanel = () => (
    <>
      <header className="flex h-14 items-center border-b px-4">
        <h2 className="font-semibold text-lg tracking-tight">AI Agent</h2>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-4 text-sm text-muted-foreground space-y-4">
          <p>This is your AI Agent panel.</p>
          <p>The agent has access to a virtual file system and can perform actions like creating, reading, updating, and deleting files and folders.</p>
          <p>Try asking the assistant:
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>"List all files and folders."</li>
                <li>"Create a new folder called 'styles'."</li>
                <li>"Save the current code to a new file named 'styles/main.css'."</li>
                <li>"Delete the 'docs' folder."</li>
            </ul>
          </p>
          <Button className="w-full mt-4" disabled>Run Workflow (Coming Soon)</Button>
        </div>
      </ScrollArea>
    </>
  );

const SettingsPanel = () => (
  <>
    <header className="flex h-14 items-center border-b px-4">
      <h2 className="font-semibold text-lg tracking-tight">Settings</h2>
    </header>
    <ScrollArea className="flex-1">
      <div className="p-4">
        <Tabs defaultValue="user">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
          </TabsList>
          <TabsContent value="user" className="mt-6 space-y-6">
            <h3 className="text-md font-medium">Appearance</h3>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Select your preferred color theme.
                </p>
              </div>
              <ThemeToggle />
            </div>
             <h3 className="text-md font-medium">Editor</h3>
             <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="autosave">Auto Save</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically save files after a delay.
                </p>
              </div>
              <Switch id="autosave" defaultChecked />
            </div>
          </TabsContent>
          <TabsContent value="workspace" className="mt-6 space-y-6">
            <h3 className="text-md font-medium">Editor</h3>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="tabsize">Tab Size</Label>
                 <p className="text-xs text-muted-foreground">
                  The number of spaces a tab is equal to.
                </p>
              </div>
              <Input id="tabsize" type="number" defaultValue="2" className="w-20" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  </>
);

const HelpPanel = () => (
    <>
      <header className="flex h-14 items-center border-b px-4">
        <h2 className="font-semibold text-lg tracking-tight">Help</h2>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
            <Input placeholder="Search documentation..."/>
            <div>
                <h3 className="text-md font-medium mb-3">Keyboard Shortcuts</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between items-center"><span>Toggle Primary Side Bar</span> <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">Ctrl+B</kbd></div>
                    <div className="flex justify-between items-center"><span>Run Code</span> <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">F5</kbd></div>
                </div>
            </div>
             <div>
                <h3 className="text-md font-medium mb-3">Support</h3>
                <Button variant="outline" className="w-full">Contact Support</Button>
            </div>
        </div>
      </ScrollArea>
    </>
  );

export function AIStudio() {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [output, setOutput] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [chatInput, setChatInput] = useState<string>('');
  const [isOutputVisible, setIsOutputVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('explorer');
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);
  const [activeFile, setActiveFile] = useState<string>('script.js');
  const [fileList, setFileList] = useState<string[]>([]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['docs/']));
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'Welcome to the mock interactive terminal!',
    "Type 'help' for a list of available commands.",
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  const scrollTerminalToBottom = () => {
    terminalEndRef.current?.scrollIntoView();
  };

  useEffect(() => {
    scrollTerminalToBottom();
  }, [terminalHistory]);


  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const refreshFileList = useCallback(async () => {
    try {
        const files = await listFiles();
        files.sort();
        setFileList(files);
        return files;
    } catch (error) {
        console.error("Failed to fetch file list", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not refresh file list.' });
        return [];
    }
  }, [toast]);

  const handleFileSelect = useCallback(async (fileName: string) => {
    if (isLoading || fileName.endsWith('/')) return;
    setIsLoading(true);
    try {
        const content = await readFile(fileName);
        if (content !== null) {
            const newLang = getLanguageFromPath(fileName);
            setLanguage(newLang);
            setCode(content);
            setActiveFile(fileName);
            setOutput([]);
        } else {
             toast({ title: 'File is empty', description: `${fileName} is empty or could not be read.` });
             setCode('');
             setActiveFile(fileName);
        }
    } catch (error) {
        console.error(`Failed to load ${fileName}`, error);
        toast({ variant: 'destructive', title: 'Error', description: `Failed to load ${fileName}` });
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, toast]);

   // Initial load
   useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await refreshFileList();
      handleFileSelect('script.js');
      setIsLoading(false);
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunCode = async () => {
    if (language !== 'javascript') {
      setOutput([`Execution of ${language} is not supported in this version.`]);
      return;
    }
    setIsLoading(true);
    setOutput(['Executing...']);
    const result = await runJavascript(code);
    setOutput(result);
    setIsLoading(false);
  };
  
  const handleTerminalCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = terminalInput.trim();
      let newHistory = [...terminalHistory, `$ ${command}`];

      if (command) {
        switch (command.toLowerCase()) {
          case 'ls':
            if (fileList.length > 0) {
              newHistory.push(fileList.join('\n'));
            } else {
              newHistory.push('No files or folders found.');
            }
            break;
          case 'help':
            newHistory.push('Available commands: ls, help, clear, date');
            break;
          case 'clear':
            newHistory = [];
            break;
          case 'date':
            newHistory.push(new Date().toLocaleString());
            break;
          default:
            newHistory.push(`command not found: ${command}`);
            break;
        }
      }
      setTerminalHistory(newHistory);
      setTerminalInput('');
    }
  };

  const handleExplain = async () => {
    if (!editorRef.current) return;
    const selection = editorRef.current.getSelection();
    const selectedCode = selection && !selection.isEmpty() ? editorRef.current.getModel()?.getValueInRange(selection) : code;
    
    if (!selectedCode?.trim()) {
      toast({ title: 'No code selected', description: 'Please select a code snippet or have code in the editor to explain.' });
      return;
    }
    
    setIsLoading(true);
    setChatMessages(prev => [...prev, {role: 'user', content: `Explain this code:\n\`\`\`${language}\n${selectedCode}\n\`\`\``}]);
    setIsRightSidebarVisible(true);
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
    setIsRightSidebarVisible(true);
    
    try {
      const result = await fixCodeErrors({ code, language });
      if (result.correctedCode !== code) {
          setCode(result.correctedCode);
          await saveFile(activeFile, result.correctedCode);
          toast({title: 'Code Fixed', description: 'Errors were found and corrected.'});
      }
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
      editorRef.current.executeEdits('ai-autocomplete', [{
        range: editorRef.current.getModel()!.getFullModelRange(),
        text: result.completedCode
      }]);
      await saveFile(activeFile, result.completedCode);
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
    setIsRightSidebarVisible(true);

    try {
        const result = await chatWithCode({ code, language, query: newQuery });
        setChatMessages(prev => [...prev, {role: 'ai', content: result.response}]);
        const updatedFiles = await refreshFileList();
        // If the active file was deleted, load a new one
        if (!updatedFiles.includes(activeFile)) {
            const newFileToOpen = updatedFiles.find(f => !f.endsWith('/')) || '';
            if (newFileToOpen) {
                handleFileSelect(newFileToOpen);
            } else {
                setActiveFile('');
                setCode('');
            }
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to get a response.' });
        setChatMessages(prev => [...prev, {role: 'ai', content: 'Sorry, I encountered an error.'}]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleActivityClick = (view: ActiveView) => {
    if (activeView === view && isLeftSidebarVisible) {
      setIsLeftSidebarVisible(false);
    } else {
      setActiveView(view);
      setIsLeftSidebarVisible(true);
    }
  };

  const handleToggleFolder = (folderPath: string) => {
    setOpenFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderPath)) {
            newSet.delete(folderPath);
        } else {
            newSet.add(folderPath);
        }
        return newSet;
    });
  };

  const handleCreateFile = async (basePath: string) => {
    const fileName = prompt("Enter new file name:", "new-file.js");
    if (fileName) {
        const fullPath = basePath ? `${basePath}${fileName}` : fileName;
        await saveFile(fullPath, '');
        await refreshFileList();
        handleFileSelect(fullPath);
    }
  };

  const handleCreateFolder = async (basePath: string) => {
    const folderName = prompt("Enter new folder name:", "new-folder");
    if (folderName) {
        const fullPath = basePath ? `${basePath}${folderName}/` : `${folderName}/`;
        await createFolder(fullPath);
        await refreshFileList();
        setOpenFolders(prev => new Set(prev).add(fullPath));
    }
  };

  const handleDeletePath = async (path: string) => {
    if (confirm(`Are you sure you want to delete "${path}"?`)) {
        await deletePath(path);
        const newFiles = await refreshFileList();
        if (path === activeFile || activeFile.startsWith(path)) {
            const fileToOpen = newFiles.find(f => !f.endsWith('/')) || '';
            if (fileToOpen) {
                handleFileSelect(fileToOpen);
            } else {
                setActiveFile('');
                setCode('');
            }
        }
    }
  };

  const handleExportProject = async () => {
    toast({ title: 'Exporting project...' });
    try {
        const files = await getProjectFiles();
        const zip = new JSZip();
        
        for (const [path, content] of Object.entries(files)) {
            if (content !== null) {
                zip.file(path, content);
            } else if (path.endsWith('/')) {
                zip.folder(path);
            }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = 'ai-studio-project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast({ title: 'Project exported successfully!' });
    } catch (error) {
        console.error('Failed to export project', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not export project.' });
    }
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast({ title: 'Importing project...' });
    setIsLoading(true);

    try {
        const zip = new JSZip();
        const content = await file.arrayBuffer();
        await zip.loadAsync(content);

        const filesToImport: Record<string, string | null> = {};
        const promises: Promise<void>[] = [];
        
        zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) {
                 filesToImport[zipEntry.name] = null;
            } else {
                const promise = zipEntry.async('string').then(fileContent => {
                    filesToImport[zipEntry.name] = fileContent;
                });
                promises.push(promise);
            }
        });

        await Promise.all(promises);
        await importProjectFiles(filesToImport);
        
        const newFiles = await refreshFileList();
        const firstFile = newFiles.find(f => !f.endsWith('/')) || 'script.js';
        await handleFileSelect(firstFile);
        
        toast({ title: 'Project imported successfully!' });
    } catch (error) {
        console.error('Failed to import project', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not import project. Ensure it is a valid zip file.' });
    } finally {
        setIsLoading(false);
        if (event.target) {
            event.target.value = '';
        }
    }
  };

  const handleHelpMenuClick = () => {
    setActiveView('help');
    setIsLeftSidebarVisible(true);
  };


  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans">
      {/* Activity Bar */}
      <div className="flex w-16 flex-col justify-between items-center gap-y-4 border-r bg-card py-4">
        <div className="flex flex-col items-center gap-y-4">
          <button 
            onClick={() => handleActivityClick('explorer')}
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                activeView === 'explorer' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="Files"
            title="Files"
          >
            <FileCode2 className="h-6 w-6" />
          </button>
          <button 
            onClick={() => handleActivityClick('search')}
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                activeView === 'search' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="Search"
            title="Search"
          >
            <Search className="h-6 w-6" />
          </button>
          <button 
            onClick={() => handleActivityClick('source-control')}
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                activeView === 'source-control' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="Source Control"
            title="Source Control"
          >
            <GitBranch className="h-6 w-6" />
          </button>
          <button 
            onClick={() => handleActivityClick('extensions')}
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                activeView === 'extensions' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="Extensions"
            title="Extensions"
          >
            <Puzzle className="h-6 w-6" />
          </button>
          <button 
            onClick={() => handleActivityClick('agent')}
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                activeView === 'agent' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="AI Agent"
            title="AI Agent"
          >
            <BrainCircuit className="h-6 w-6" />
          </button>
          <button 
            onClick={() => handleActivityClick('build')}
            className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                activeView === 'build' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
            aria-label="Build & Deploy"
            title="Build & Deploy"
          >
            <Hammer className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-y-4">
            <button
                onClick={() => handleActivityClick('settings')}
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    activeView === 'settings' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label="Settings"
                title="Settings"
            >
                <Settings className="h-6 w-6" />
            </button>
            <button
                onClick={() => handleActivityClick('help')}
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    activeView === 'help' && isLeftSidebarVisible ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
                aria-label="Help"
                title="Help"
            >
                <HelpCircle className="h-6 w-6" />
            </button>
        </div>
      </div>
      
      {/* Left Sidebar */}
      {isLeftSidebarVisible && (
        <div className="hidden w-64 border-r bg-card md:flex md:flex-col shrink-0">
          {activeView === 'explorer' && <ExplorerPanel 
            files={fileList} 
            activeFile={activeFile} 
            onFileSelect={handleFileSelect} 
            openFolders={openFolders}
            onToggleFolder={handleToggleFolder}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDelete={handleDeletePath}
            />}
          {activeView === 'search' && <SearchPanel />}
          {activeView === 'source-control' && <SourceControlPanel />}
          {activeView === 'extensions' && <ExtensionsPanel />}
          {activeView === 'agent' && <AgentPanel />}
          {activeView === 'build' && <BuildPanel />}
          {activeView === 'settings' && <SettingsPanel />}
          {activeView === 'help' && <HelpPanel />}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Menubar className="h-auto rounded-none border-x-0 border-t-0 border-b px-2">
            <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={() => handleCreateFile('')}>New File...</MenubarItem>
                    <MenubarItem onClick={() => handleCreateFolder('')}>New Folder...</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem onClick={handleImportClick}>Import Project...</MenubarItem>
                    <MenubarItem onClick={handleExportProject}>Export Project...</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger>Edit</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem disabled>Undo</MenubarItem>
                    <MenubarItem disabled>Redo</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={() => setIsLeftSidebarVisible(p => !p)}>Toggle Primary Side Bar</MenubarItem>
                    <MenubarItem onClick={() => setIsRightSidebarVisible(p => !p)}>Toggle Assistant Panel</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
             <MenubarMenu>
                <MenubarTrigger>Run</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={handleRunCode}>Run Code <MenubarShortcut>F5</MenubarShortcut></MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger>Help</MenubarTrigger>
                <MenubarContent>
                    <MenubarItem onClick={handleHelpMenuClick}>Help / Docs</MenubarItem>
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
        <main className="flex-1 flex flex-col min-h-0">
          {/* Top Bar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 gap-4">
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
                  <Button variant="ghost" size="icon" onClick={() => setIsRightSidebarVisible(!isRightSidebarVisible)} className="hidden lg:inline-flex">
                      <PanelRight className="h-5 w-5" />
                      <span className="sr-only">Toggle Assistant</span>
                  </Button>
              </div>
          </header>

          {/* Editor and Output */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              <DynamicEditor
                language={language}
                value={code}
                onChange={(value) => {
                  setCode(value || '');
                  if (activeFile) {
                    saveFile(activeFile, value || '');
                  }
                }}
                onMount={handleEditorDidMount}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
              />
            </div>
            {isOutputVisible && (
              <Tabs
                defaultValue="output"
                className="h-64 border-t bg-card flex flex-col"
                onValueChange={(value) => {
                  if (value === 'terminal') {
                    setTimeout(() => terminalInputRef.current?.focus(), 100);
                  }
                }}
              >
                <div className="flex items-center justify-between border-b pl-2 pr-1 shrink-0">
                  <TabsList className="bg-transparent p-0">
                    <TabsTrigger value="output" className="px-4 py-3 text-sm font-medium">Output</TabsTrigger>
                    <TabsTrigger value="terminal" className="px-4 py-3 text-sm font-medium">Terminal</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="icon" onClick={() => setIsOutputVisible(false)}>
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>
                <TabsContent value="output" className="flex-1 mt-0 overflow-y-auto">
                  <ScrollArea className="h-full">
                    <pre className="p-4 text-sm font-code">{output.join('\n')}</pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent
                  value="terminal"
                  className="flex-1 mt-0 flex flex-col"
                  onClick={() => terminalInputRef.current?.focus()}
                >
                  <ScrollArea className="flex-1">
                    <div className="p-4 text-sm font-code">
                      {terminalHistory.map((line, index) => (
                        <pre key={index} className="whitespace-pre-wrap leading-relaxed">{line}</pre>
                      ))}
                      <div ref={terminalEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="flex shrink-0 gap-2 items-center px-4 pb-2">
                    <span className="text-accent">$</span>
                    <input
                        ref={terminalInputRef}
                        type="text"
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={handleTerminalCommand}
                        className="bg-transparent border-none outline-none w-full font-code text-sm p-0"
                        autoComplete="off"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
            {!isOutputVisible && (
              <header className="flex h-12 items-center justify-between border-t px-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  <h2 className="font-medium">Terminal</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOutputVisible(true)}>
                  <ChevronUp className="h-5 w-5" />
                </Button>
              </header>
            )}
          </div>
        </main>
        
        {/* Status Bar */}
        <footer className="flex h-8 shrink-0 items-center justify-between border-t bg-primary text-primary-foreground px-4 text-xs">
          <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span>main</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{activeFile}</span>
            <span className='capitalize'>{language}</span>
            <span>UTF-8</span>
          </div>
        </footer>
      </div>

      {/* Right Sidebar (AI Assistant) */}
      {isRightSidebarVisible && (
        <aside className="w-96 border-l bg-card hidden lg:flex flex-col shrink-0">
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
      )}
      <input type="file" ref={importFileRef} onChange={handleImportProject} style={{ display: 'none' }} accept=".zip" />
    </div>
  );
}
