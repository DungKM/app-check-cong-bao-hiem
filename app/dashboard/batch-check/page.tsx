import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import BatchCheckClient from './batch-check-client';

export default async function BatchCheckPage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const inboxIds = searchParams.ids
    ? searchParams.ids.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <main className="p-6">
      <BatchCheckClient inboxIds={inboxIds} />
    </main>
  );
}
