import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Check Cổng Bảo Hiểm',
  description: 'Kiểm tra cổng Bảo Hiểm Y Tế — nhanh chóng và chính xác.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="vi" className={inter.variable}>
      <body className={inter.className}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
