"use client";

import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: OnChange;
  onMount: OnMount;
  theme?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  value,
  onChange,
  onMount,
  theme,
}) => {
  const { resolvedTheme } = useTheme();
  const editorTheme = theme || (resolvedTheme === 'dark' ? 'vs-dark' : 'light');

  return (
    <Editor
      height="100%"
      language={language}
      theme={editorTheme}
      value={value}
      onChange={onChange}
      onMount={onMount}
      options={{
        fontFamily: "'Source Code Pro', monospace",
        fontSize: 14,
        minimap: {
          enabled: true,
        },
        contextmenu: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
      }}
    />
  );
};

export default CodeEditor;
