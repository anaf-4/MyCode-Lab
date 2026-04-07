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

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM repositories ORDER BY updated_at DESC');
    return NextResponse.json(rows.map(toCamelCase));
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
