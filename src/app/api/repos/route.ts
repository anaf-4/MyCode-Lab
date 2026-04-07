import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM repositories ORDER BY updated_at DESC');
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pool = getPool();
    const { id, name, description, tags, file_count, total_size, languages } = body;

    await pool.query(
      `INSERT INTO repositories (id, name, description, tags, file_count, total_size, languages)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description || '', JSON.stringify(tags || []), file_count || 0, total_size || 0, JSON.stringify(languages || [])]
    );

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
