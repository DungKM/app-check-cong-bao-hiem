import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import authOptions from './auth';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getUserData(email: string) {
  const client = await clientPromise;
  const db = client.db();
  return db.collection('users').findOne({ email: email.toLowerCase() });
}
