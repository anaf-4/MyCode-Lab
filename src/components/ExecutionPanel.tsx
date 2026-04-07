'use client';

import { useState, useCallback, useRef } from 'react';

interface ExecutionPanelProps {
  code: string;
  language: string;
}

export default function ExecutionPanel({ code, language }: ExecutionPanelProps) {
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'console'>('preview');
  const [pyodideError, setPyodideError] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isWebLanguage = ['html', 'css', 'javascript', 'typescript'].includes(language.toLowerCase());
  const isPython = language.toLowerCase() === 'python';

  const runWebCode = useCallback(() => {
    setIsRunning(true);
    setOutput('');
    setActiveTab('preview');

    let htmlContent = code;

    if (language.toLowerCase() === 'html') {
      htmlContent = code;
    } else if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
      htmlContent = `<!DOCTYPE html>
<html>
<head><style>body { font-family: monospace; padding: 16px; background: #1e1e1e; color: #d4d4d4; margin: 0; }</style></head>
<body>
  <div id="output"></div>
  <script>
    (function() {
      const output = document.getElementById('output');
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      function append(msg, color) {
        const line = document.createElement('div');
        line.style.cssText = 'padding: 2px 0; border-bottom: 1px solid #333; color: ' + (color || '#d4d4d4');
        line.textContent = msg;
        output.appendChild(line);
      }

      console.log = function() { append(Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); originalLog.apply(console, arguments); };
      console.error = function() { append(Array.from(arguments).join(' '), '#f87171'); originalError.apply(console, arguments); };
      console.warn = function() { append(Array.from(arguments).join(' '), '#fbbf24'); originalWarn.apply(console, arguments); };

      try { ${code} }
      catch(e) { console.error('Error: ' + e.message); }
    })();
  </script>
</body>
</html>`;
    } else if (language.toLowerCase() === 'css') {
      htmlContent = `<!DOCTYPE html>
<html>
<head><style>${code}</style></head>
<body style="padding: 20px; font-family: sans-serif; background: #1a1a2e; color: #eee;">
  <h1>CSS Preview</h1>
  <p>This is a paragraph to preview your CSS styles.</p>
  <div class="card"><h3>Sample Card</h3><p>Your CSS is applied to this page.</p></div>
  <button>Sample Button</button>
</body>
</html>`;
    }

    setOutput(htmlContent);
    setIsRunning(false);
  }, [code, language]);

  const runPythonCode = useCallback(() => {
    setIsRunning(true);
    setOutput('');
    setActiveTab('console');
    setPyodideError('');

    // Use an iframe to load Pyodide in an isolated sandbox
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');

    const pyodideVersion = '0.27.2';
    const cdnBase = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full`;

    iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
  <script src="${cdnBase}/pyodide.js"><\/script>
</head>
<body>
<script>
  (async function() {
    const parent = window.parent;
    try {
      const pyodide = await loadPyodide({ indexURL: '${cdnBase}' });

      pyodide.setStdout({ batched: (msg) => parent.postMessage({ type: 'pyout', data: msg }, '*') });
      pyodide.setStderr({ batched: (msg) => parent.postMessage({ type: 'pyerr', data: msg }, '*') });

      try {
        await pyodide.runPythonAsync(\`${code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`);
        parent.postMessage({ type: 'pydone' }, '*');
      } catch (e) {
        parent.postMessage({ type: 'pyerr', data: e.message }, '*');
        parent.postMessage({ type: 'pydone' }, '*');
      }
    } catch (e) {
      parent.postMessage({ type: 'pyerr', data: 'Failed to load Python: ' + e.message }, '*');
      parent.postMessage({ type: 'pydone' }, '*');
    }
  })();
<\/script>
</body>
</html>`;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'pyout') {
        setOutput((prev) => prev + event.data.data + '\n');
      } else if (event.data?.type === 'pyerr') {
        setOutput((prev) => prev + event.data.data + '\n');
      } else if (event.data?.type === 'pydone') {
        window.removeEventListener('message', handleMessage);
        document.body.removeChild(iframe);
        setIsRunning(false);
      }
    };

    window.addEventListener('message', handleMessage);
    document.body.appendChild(iframe);
  }, [code]);

  const handleRun = useCallback(() => {
    if (isWebLanguage) {
      runWebCode();
    } else if (isPython) {
      runPythonCode();
    } else {
      setOutput(`Execution not supported for language: ${language}`);
    }
  }, [isWebLanguage, isPython, language, runWebCode, runPythonCode]);

  const canRun = isWebLanguage || isPython;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          {isWebLanguage && (
            <>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('console')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === 'console'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                Console
              </button>
            </>
          )}
          {isPython && (
            <span className="px-3 py-1 rounded text-xs font-medium bg-yellow-600/20 text-yellow-400">
              Python Console
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={!canRun || isRunning}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              canRun && !isRunning
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              <>Run</>
            )}
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'preview' && isWebLanguage ? (
          <iframe
            ref={iframeRef}
            srcDoc={output}
            className="w-full h-full bg-white"
            sandbox="allow-scripts"
            title="Code Preview"
          />
        ) : (
          <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
            {output || (
              <span className="text-gray-500">
                {canRun ? 'Click "Run" to execute code...' : `Execution not supported for ${language}`}
              </span>
            )}
            {pyodideError && <span className="text-red-400 block mt-2">{pyodideError}</span>}
          </pre>
        )}
      </div>
    </div>
  );
}
