import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '50'), 100);
  const client = await clientPromise;
  const docs = await client.db()
    .collection('analyses')
    .find({ userEmail: session.user.email })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const client = await clientPromise;
  const result = await client.db().collection('analyses').insertOne({
    ...body,
    userEmail: session.user.email,
    userName:  session.user.name,
    createdAt: new Date(),
  });
  return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const update = await req.json();
  const client = await clientPromise;
  await client.db().collection('analyses').updateOne(
    { _id: new ObjectId(id), userEmail: session.user.email },
    { $set: update },
  );
  return NextResponse.json({ ok: true });
}
