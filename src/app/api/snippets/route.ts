import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM snippets ORDER BY updated_at DESC');
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pool = getPool();
    const { id, title, language, code, tags, repository_id, path } = body;

    await pool.query(
      `INSERT INTO snippets (id, title, language, code, tags, repository_id, path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title, language, code, JSON.stringify(tags || []), repository_id || null, path || null]
    );

    // Update repo file count if applicable
    if (repository_id) {
      await pool.query(
        `UPDATE repositories SET file_count = file_count + 1 WHERE id = ?`,
        [repository_id]
      );
    }

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
