import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';

// ── Auth helpers ───────────────────────────────────────────
function getApiToken() {
  return process.env.XML_INBOX_TOKEN?.trim() || '';
}

function bearerToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

// ── GET — list with filters ────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const source    = searchParams.get('source') || 'all';   // 'all' | 'api' | 'manual'
  const status    = searchParams.get('status') || 'all';   // 'all' | 'new' | 'checked'
  const search    = searchParams.get('search') || '';
  const dateFrom  = searchParams.get('from');               // 'YYYY-MM-DD'
  const dateTo    = searchParams.get('to');
  const page      = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit     = 50;

  const query: Record<string, any> = {};

  // Non-admin only sees their own manual uploads + all API files
  if (session.user?.role !== 'admin') {
    query.$or = [
      { source: 'api' },
      { source: 'manual', uploadedBy: session.user?.email },
    ];
  }

  if (source !== 'all') query.source = source;
  if (status !== 'all') query.status = status;

  if (search) query.fileName = { $regex: search, $options: 'i' };

  if (dateFrom || dateTo) {
    query.receivedAt = {};
    if (dateFrom) query.receivedAt.$gte = new Date(dateFrom + 'T00:00:00.000Z');
    if (dateTo)   query.receivedAt.$lte = new Date(dateTo   + 'T23:59:59.999Z');
  }

  const client = await clientPromise;
  const col    = client.db().collection('xml_inbox');

  const [items, total] = await Promise.all([
    col.find(query, { projection: { xmlContent: 0 } })
       .sort({ receivedAt: -1 })
       .skip((page - 1) * limit)
       .limit(limit)
       .toArray(),
    col.countDocuments(query),
  ]);

  const data = items.map((d: any) => ({
    _id:        d._id.toString(),
    fileName:   d.fileName,
    source:     d.source,
    sourceName: d.sourceName || '',
    status:     d.status || 'new',
    uploadedBy: d.uploadedBy || '',
    receivedAt: d.receivedAt?.toISOString() || '',
    info:       d.info || null,
  }));

  return NextResponse.json({ data, total, page, limit });
}

// ── POST — receive file ────────────────────────────────────
export async function POST(req: NextRequest) {
  const token     = bearerToken(req);
  const apiToken  = getApiToken();
  const session   = await getSession();

  let source:     'api' | 'manual';
  let uploadedBy: string;
  let sourceName: string;

  if (token && apiToken && token === apiToken) {
    source     = 'api';
    uploadedBy = 'api';
    sourceName = '';
  } else if (session) {
    source     = 'manual';
    uploadedBy = session.user?.email || '';
    sourceName = session.user?.name  || uploadedBy;
  } else {
    return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
  }

  const ct = req.headers.get('content-type') || '';
  let fileName   = '';
  let xmlContent = '';

  if (ct.includes('application/json')) {
    const body = await req.json();
    fileName   = (body.fileName   || '').trim();
    xmlContent = (body.content    || '').trim();
    if (source === 'api' && body.sourceName) sourceName = String(body.sourceName);
    // support base64
    if (body.encoding === 'base64') {
      try { xmlContent = Buffer.from(xmlContent, 'base64').toString('utf-8'); } catch {}
    }
  } else if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'Thiếu file' }, { status: 400 });
    fileName   = file.name;
    xmlContent = await file.text();
  } else {
    return NextResponse.json({ message: 'Content-Type không hỗ trợ' }, { status: 415 });
  }

  if (!fileName)   return NextResponse.json({ message: 'Thiếu tên file'   }, { status: 400 });
  if (!xmlContent) return NextResponse.json({ message: 'Thiếu nội dung XML' }, { status: 400 });
  if (!fileName.toLowerCase().endsWith('.xml')) fileName += '.xml';

  const client = await clientPromise;
  const result = await client.db().collection('xml_inbox').insertOne({
    fileName,
    xmlContent,
    source,
    sourceName,
    uploadedBy,
    status:     'new',
    receivedAt: new Date(),
    info:       null,
  });

  return NextResponse.json({ id: result.insertedId.toString(), message: 'Nhận file thành công.' }, { status: 201 });
}
