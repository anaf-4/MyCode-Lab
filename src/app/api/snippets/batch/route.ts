import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snippets, repositoryId } = body;

    if (!Array.isArray(snippets) || snippets.length === 0) {
      return NextResponse.json({ error: 'Snippets array required' }, { status: 400 });
    }

    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      for (const s of snippets) {
        await conn.query(
          `INSERT INTO snippets (id, title, language, code, tags, repository_id, path)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.title, s.language, s.code, JSON.stringify(s.tags || []), repositoryId || null, s.path || null]
        );
      }

      // Update repo file count
      if (repositoryId) {
        await conn.query(
          'UPDATE repositories SET file_count = file_count + ? WHERE id = ?',
          [snippets.length, repositoryId]
        );
      }

      await conn.commit();
      return NextResponse.json({ success: true, count: snippets.length }, { status: 201 });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
