import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import type { RowDataPacket } from 'mysql2';

function toCamelCase(row: RowDataPacket): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = value;
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try { result[camelKey] = JSON.parse(value); } catch { /* ignore */ }
    }
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snippets, repositoryId } = body;

    console.log('[Batch API] Received:', {
      snippetCount: snippets?.length,
      repositoryId,
      firstSnippetId: snippets?.[0]?.id,
    });

    if (!Array.isArray(snippets) || snippets.length === 0) {
      return NextResponse.json({ error: 'Snippets array required' }, { status: 400 });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      for (let i = 0; i < snippets.length; i++) {
        const s = snippets[i];
        console.log(`[Batch API] Inserting ${i + 1}/${snippets.length}: id=${s.id}, repoId=${repositoryId}`);
        await conn.query(
          `INSERT INTO snippets (id, title, language, code, tags, repository_id, path)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.title, s.language, s.code, JSON.stringify(s.tags || []), repositoryId || null, s.path || null]
        );
      }

      if (repositoryId) {
        await conn.query(
          'UPDATE repositories SET file_count = file_count + ? WHERE id = ?',
          [snippets.length, repositoryId]
        );
      }

      await conn.commit();
      console.log('[Batch API] Success: committed', snippets.length, 'snippets');
      return NextResponse.json({ success: true, count: snippets.length }, { status: 201 });
    } catch (err) {
      await conn.rollback();
      console.error('[Batch API] Transaction failed:', err);
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[Batch API] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
