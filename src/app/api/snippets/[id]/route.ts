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
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM snippets WHERE id = ?', [id]);
    if (rows.length === 0) return NextResponse.json({ error: 'Snippet not found' }, { status: 404 });
    return NextResponse.json(toCamelCase(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
    if (body.language !== undefined) { fields.push('language = ?'); values.push(body.language); }
    if (body.code !== undefined) { fields.push('code = ?'); values.push(body.code); }
    if (body.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
    if (body.path !== undefined) { fields.push('path = ?'); values.push(body.path); }
    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    values.push(id);
    await pool.query(`UPDATE snippets SET ${fields.join(', ')} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT repository_id FROM snippets WHERE id = ?', [id]);
    const repositoryId = (rows[0] as any)?.repository_id;
    await pool.query('DELETE FROM snippets WHERE id = ?', [id]);
    if (repositoryId) {
      await pool.query('UPDATE repositories SET file_count = GREATEST(file_count - 1, 0) WHERE id = ?', [repositoryId]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
