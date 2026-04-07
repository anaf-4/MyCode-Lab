const DB_NAME = 'mycode-lab-db';
const DB_VERSION = 2;
const SNIPPETS_STORE = 'snippets';
const REPOS_STORE = 'repositories';

export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  repositoryId?: string;  // belongs to a repository
  path?: string;           // file path within repository (e.g., "src/components/Button.tsx")
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  totalSize: number;
  languages: string[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Snippets store
      if (!db.objectStoreNames.contains(SNIPPETS_STORE)) {
        const store = db.createObjectStore(SNIPPETS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('language', 'language', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        store.createIndex('repositoryId', 'repositoryId', { unique: false });
      } else {
        // Add repositoryId index to existing store
        const tx = request.transaction!;
        const store = tx.objectStore(SNIPPETS_STORE);
        if (!store.indexNames.contains('repositoryId')) {
          store.createIndex('repositoryId', 'repositoryId', { unique: false });
        }
      }

      // Repositories store
      if (!db.objectStoreNames.contains(REPOS_STORE)) {
        const store = db.createObjectStore(REPOS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      })
  );
}

// ===== SNIPPET OPERATIONS =====

export async function getAllSnippets(): Promise<CodeSnippet[]> {
  return withStore(SNIPPETS_STORE, 'readonly', (store) => store.getAll());
}

export async function getStandaloneSnippets(): Promise<CodeSnippet[]> {
  const all = await getAllSnippets();
  return all.filter((s) => !s.repositoryId);
}

export async function getSnippetById(id: string): Promise<CodeSnippet | undefined> {
  return withStore(SNIPPETS_STORE, 'readonly', (store) => store.get(id));
}

export async function getSnippetsByRepo(repositoryId: string): Promise<CodeSnippet[]> {
  const all = await getAllSnippets();
  return all.filter((s) => s.repositoryId === repositoryId);
}

export async function addSnippet(snippet: CodeSnippet): Promise<void> {
  return withStore(SNIPPETS_STORE, 'readwrite', (store) => store.add(snippet) as unknown as IDBRequest<void>);
}

export async function addSnippetsBatch(snippets: CodeSnippet[]): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(SNIPPETS_STORE, 'readwrite');
        const store = tx.objectStore(SNIPPETS_STORE);
        for (const snippet of snippets) {
          store.add(snippet);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function updateSnippet(id: string, updates: Partial<CodeSnippet>): Promise<void> {
  const snippet = await getSnippetById(id);
  if (!snippet) throw new Error(`Snippet ${id} not found`);
  const updated = { ...snippet, ...updates, updatedAt: new Date().toISOString() };
  return withStore(SNIPPETS_STORE, 'readwrite', (store) => store.put(updated) as unknown as IDBRequest<void>);
}

export async function deleteSnippet(id: string): Promise<void> {
  return withStore(SNIPPETS_STORE, 'readwrite', (store) => store.delete(id) as unknown as IDBRequest<void>);
}

export async function deleteSnippetsByRepo(repositoryId: string): Promise<void> {
  const snippets = await getSnippetsByRepo(repositoryId);
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(SNIPPETS_STORE, 'readwrite');
        const store = tx.objectStore(SNIPPETS_STORE);
        for (const s of snippets) {
          store.delete(s.id);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ===== REPOSITORY OPERATIONS =====

export async function getAllRepos(): Promise<Repository[]> {
  return withStore(REPOS_STORE, 'readonly', (store) => store.getAll());
}

export async function getRepoById(id: string): Promise<Repository | undefined> {
  return withStore(REPOS_STORE, 'readonly', (store) => store.get(id));
}

export async function addRepo(repo: Repository): Promise<void> {
  return withStore(REPOS_STORE, 'readwrite', (store) => store.add(repo) as unknown as IDBRequest<void>);
}

export async function updateRepo(id: string, updates: Partial<Repository>): Promise<void> {
  const repo = await getRepoById(id);
  if (!repo) throw new Error(`Repository ${id} not found`);
  const updated = { ...repo, ...updates, updatedAt: new Date().toISOString() };
  return withStore(REPOS_STORE, 'readwrite', (store) => store.put(updated) as unknown as IDBRequest<void>);
}

export async function deleteRepo(id: string): Promise<void> {
  await deleteSnippetsByRepo(id);
  return withStore(REPOS_STORE, 'readwrite', (store) => store.delete(id) as unknown as IDBRequest<void>);
}

// ===== SEARCH =====

export async function searchSnippets(query: string): Promise<CodeSnippet[]> {
  const all = await getAllSnippets();
  const lowerQuery = query.toLowerCase();
  return all.filter(
    (s) =>
      s.title.toLowerCase().includes(lowerQuery) ||
      s.code.toLowerCase().includes(lowerQuery) ||
      s.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
      s.language.toLowerCase().includes(lowerQuery) ||
      (s.path && s.path.toLowerCase().includes(lowerQuery))
  );
}

export async function searchRepos(query: string): Promise<Repository[]> {
  const all = await getAllRepos();
  const lowerQuery = query.toLowerCase();
  return all.filter(
    (r) =>
      r.name.toLowerCase().includes(lowerQuery) ||
      r.description.toLowerCase().includes(lowerQuery) ||
      r.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
      r.languages.some((l) => l.toLowerCase().includes(lowerQuery))
  );
}

// ===== HELPERS =====

export async function getAllTags(): Promise<string[]> {
  const all = await getAllSnippets();
  const tagSet = new Set<string>();
  all.forEach((s) => s.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export async function getAllLanguages(): Promise<string[]> {
  const all = await getAllSnippets();
  const langSet = new Set<string>();
  all.forEach((s) => langSet.add(s.language));
  return Array.from(langSet).sort();
}

export function getLanguageIcon(lang: string): string {
  const icons: Record<string, string> = {
    javascript: 'JS',
    typescript: 'TS',
    python: 'PY',
    html: 'HTML',
    css: 'CSS',
    json: '{}',
    java: 'JV',
    rust: 'RS',
    go: 'GO',
  };
  return icons[lang.toLowerCase()] || '<>';
}

export function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    javascript: '#f7df1e',
    typescript: '#3178c6',
    python: '#3776ab',
    html: '#e34f26',
    css: '#1572b6',
    json: '#5b9553',
    java: '#ed8b00',
    rust: '#dea584',
    go: '#00add8',
  };
  return colors[lang.toLowerCase()] || '#888';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function detectLanguage(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) {
    // Check for extensionless files
    const name = filename.toLowerCase();
    const specialFiles: Record<string, string> = {
      dockerfile: 'dockerfile',
      makefile: 'makefile',
      cmake: 'cmake',
      license: 'plaintext',
      readme: 'markdown',
    };
    return specialFiles[name] || 'plaintext';
  }
  const ext = parts.pop()?.toLowerCase() || '';
  return languageExtensions[ext] || 'plaintext';
}

export const languageExtensions: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  html: 'html',
  htm: 'html',
  css: 'css',
  json: 'json',
  java: 'java',
  rs: 'rust',
  go: 'go',
  sql: 'sql',
  md: 'markdown',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'plaintext',
  bash: 'plaintext',
  zsh: 'plaintext',
  ps1: 'plaintext',
  bat: 'plaintext',
  cmd: 'plaintext',
  txt: 'plaintext',
  log: 'plaintext',
  csv: 'plaintext',
  toml: 'plaintext',
  ini: 'plaintext',
  cfg: 'plaintext',
  conf: 'plaintext',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  matlab: 'matlab',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  vb: 'vb',
  f: 'fortran',
  for: 'fortran',
  asm: 'assembly',
  s: 'assembly',
  gradle: 'gradle',
  proto: 'protobuf',
  graphql: 'graphql',
  gql: 'graphql',
  vue: 'vue',
  svelte: 'svelte',
  tex: 'latex',
  latex: 'latex',
  diff: 'diff',
  patch: 'diff',
  properties: 'properties',
  groovy: 'groovy',
  perl: 'perl',
  pl: 'perl',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hs: 'haskell',
  clj: 'clojure',
  cljs: 'clojure',
  ml: 'ocaml',
};
