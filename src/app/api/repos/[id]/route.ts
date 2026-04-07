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
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM repositories WHERE id = ?', [id]);
    if (rows.length === 0) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
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
    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
    if (body.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
    if (body.file_count !== undefined) { fields.push('file_count = ?'); values.push(body.file_count); }
    if (body.total_size !== undefined) { fields.push('total_size = ?'); values.push(body.total_size); }
    if (body.languages !== undefined) { fields.push('languages = ?'); values.push(JSON.stringify(body.languages)); }
    if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    values.push(id);
    await pool.query(`UPDATE repositories SET ${fields.join(', ')} WHERE id = ?`, values);
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
    await pool.query('DELETE FROM repositories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
