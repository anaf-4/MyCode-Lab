'use client';

import { useState, useMemo } from 'react';
import { useSnippets } from '@/context/SnippetsContext';

interface SidebarProps {
  selectedTag?: string | null;
  selectedLang?: string | null;
  onTagSelect?: (tag: string | null) => void;
  onLangSelect?: (lang: string | null) => void;
}

export default function Sidebar({ selectedTag, selectedLang, onTagSelect, onLangSelect }: SidebarProps) {
  const { snippets } = useSnippets();
  const [collapsed, setCollapsed] = useState(false);

  const { tags, languages } = useMemo(() => {
    const tagSet = new Set<string>();
    const langSet = new Set<string>();
    snippets.forEach((s) => {
      s.tags.forEach((t) => tagSet.add(t));
      langSet.add(s.language);
    });
    return {
      tags: Array.from(tagSet).sort(),
      languages: Array.from(langSet).sort(),
    };
  }, [snippets]);

  return (
    <aside className={`h-full border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-300 overflow-y-auto ${collapsed ? 'w-12' : 'w-56'}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full p-3 text-right text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '\u2192' : '\u2190'}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          {/* Languages */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Languages
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => onLangSelect?.(null)}
                  className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                    !selectedLang
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  All
                </button>
              </li>
              {languages.map((lang) => (
                <li key={lang}>
                  <button
                    onClick={() => onLangSelect?.(selectedLang === lang ? null : lang)}
                    className={`w-full text-left px-2 py-1 rounded text-sm capitalize transition-colors ${
                      selectedLang === lang
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {lang}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagSelect?.(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                    selectedTag === tag
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium ring-1 ring-purple-300 dark:ring-purple-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
