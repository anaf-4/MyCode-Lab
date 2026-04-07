'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import {
  CodeSnippet,
  Repository,
  getStandaloneSnippets,
  getAllRepos,
  addSnippet as dbAddSnippet,
  addSnippetsBatch,
  updateSnippet as dbUpdateSnippet,
  deleteSnippet as dbDeleteSnippet,
  deleteSnippetsByRepo,
  addRepo as dbAddRepo,
  updateRepo as dbUpdateRepo,
  deleteRepo as dbDeleteRepo,
} from '@/lib/db';

interface SnippetsContextType {
  snippets: CodeSnippet[];
  repos: Repository[];
  loading: boolean;
  refresh: () => Promise<void>;
  saveSnippet: (snippet: CodeSnippet) => Promise<void>;
  saveSnippetsBatch: (snippets: CodeSnippet[]) => Promise<void>;
  updateSnippet: (id: string, updates: Partial<CodeSnippet>) => Promise<void>;
  deleteSnippet: (id: string) => Promise<void>;
  saveRepo: (repo: Repository) => Promise<void>;
  updateRepo: (id: string, updates: Partial<Repository>) => Promise<void>;
  deleteRepo: (id: string) => Promise<void>;
}

const SnippetsContext = createContext<SnippetsContextType | null>(null);

export function SnippetsProvider({ children }: { children: ReactNode }) {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [snippetsData, reposData] = await Promise.all([
        getStandaloneSnippets(),
        getAllRepos(),
      ]);
      setSnippets(snippetsData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setRepos(reposData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const saveSnippet = useCallback(async (snippet: CodeSnippet) => {
    try {
      await dbAddSnippet(snippet);
      setSnippets((prev) => [snippet, ...prev]);
    } catch (err) {
      console.error('Failed to save snippet:', err);
    }
  }, []);

  const saveSnippetsBatch = useCallback(async (newSnippets: CodeSnippet[]) => {
    try {
      await addSnippetsBatch(newSnippets);
      setSnippets((prev) => [...newSnippets, ...prev]);
    } catch (err) {
      console.error('Failed to save snippets batch:', err);
    }
  }, []);

  const updateSnippet = useCallback(async (id: string, updates: Partial<CodeSnippet>) => {
    try {
      await dbUpdateSnippet(id, updates);
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
        )
      );
    } catch (err) {
      console.error('Failed to update snippet:', err);
    }
  }, []);

  const deleteSnippet = useCallback(async (id: string) => {
    try {
      await dbDeleteSnippet(id);
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete snippet:', err);
    }
  }, []);

  const saveRepo = useCallback(async (repo: Repository) => {
    try {
      await dbAddRepo(repo);
      setRepos((prev) => [repo, ...prev]);
    } catch (err) {
      console.error('Failed to save repo:', err);
    }
  }, []);

  const updateRepoData = useCallback(async (id: string, updates: Partial<Repository>) => {
    try {
      await dbUpdateRepo(id, updates);
      setRepos((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        )
      );
    } catch (err) {
      console.error('Failed to update repo:', err);
    }
  }, []);

  const deleteRepo = useCallback(async (id: string) => {
    try {
      await dbDeleteRepo(id);
      setRepos((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete repo:', err);
    }
  }, []);

  const value = useMemo(
    () => ({
      snippets,
      repos,
      loading,
      refresh,
      saveSnippet,
      saveSnippetsBatch,
      updateSnippet,
      deleteSnippet,
      saveRepo,
      updateRepo: updateRepoData,
      deleteRepo,
    }),
    [snippets, repos, loading, refresh, saveSnippet, saveSnippetsBatch, updateSnippet, deleteSnippet, saveRepo, updateRepoData, deleteRepo]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#0f1117]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <SnippetsContext.Provider value={value}>{children}</SnippetsContext.Provider>;
}

export function useSnippets() {
  const ctx = useContext(SnippetsContext);
  if (!ctx) {
    throw new Error('useSnippets must be used within SnippetsProvider');
  }
  return ctx;
}
