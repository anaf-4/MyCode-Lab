'use client';

import Editor from '@monaco-editor/react';
import { useTheme } from '@/hooks/useTheme';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

const languageMap: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  html: 'html',
  css: 'css',
  json: 'json',
  java: 'java',
  rust: 'rust',
  go: 'go',
  sql: 'sql',
  markdown: 'markdown',
  xml: 'xml',
  yaml: 'yaml',
};

export default function CodeEditor({ value, language, onChange, readOnly = false, height = '100%' }: CodeEditorProps) {
  const { theme } = useTheme();
  const editorLanguage = languageMap[language.toLowerCase()] || 'plaintext';

  return (
    <Editor
      height={height}
      language={editorLanguage}
      value={value}
      onChange={(val) => onChange?.(val || '')}
      theme={theme === 'dark' ? 'vs-dark' : 'light'}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        padding: { top: 16, bottom: 16 },
        renderWhitespace: 'selection',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        contextmenu: true,
        mouseWheelZoom: true,
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'mouseover',
        matchBrackets: 'always',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}
