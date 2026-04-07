import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ snippets: [], repos: [] });
    }

    const pool = getPool();

    // Search snippets
    const [snippets]: any = await pool.query(
      `SELECT * FROM snippets
       WHERE title LIKE ? OR code LIKE ? OR language LIKE ?
       ORDER BY updated_at DESC
       LIMIT 100`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );

    // Search repos
    const [repos]: any = await pool.query(
      `SELECT * FROM repositories
       WHERE name LIKE ? OR description LIKE ?
       ORDER BY updated_at DESC
       LIMIT 50`,
      [`%${q}%`, `%${q}%`]
    );

    return NextResponse.json({ snippets, repos });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
