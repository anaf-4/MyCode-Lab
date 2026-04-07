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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Repo Snippets API] Fetching snippets for repo:', id);
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM snippets WHERE repository_id = ? ORDER BY path ASC',
      [id]
    );
    console.log('[Repo Snippets API] Found', rows.length, 'snippets');
    if (rows.length > 0) {
      console.log('[Repo Snippets API] First snippet:', rows[0]);
    }
    return NextResponse.json(rows.map(toCamelCase));
  } catch (err) {
    console.error('[Repo Snippets API] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
