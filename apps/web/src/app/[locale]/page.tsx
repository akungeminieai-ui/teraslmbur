import { redirect } from '@/i18n/routing';
import { cookies } from 'next/headers';

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Retrieve token from cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  let target: '/dashboard' | '/pos' | '/kitchen' = '/dashboard';

  if (token) {
    try {
      const payloadSegment = token.split('.')[1];
      if (payloadSegment) {
        // Decode base64 URL safe payload
        const decoded = JSON.parse(
          atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'))
        );
        const role = decoded.role;
        if (role === 'CASHIER') {
          target = '/pos';
        } else if (role === 'KITCHEN') {
          target = '/kitchen';
        }
      }
    } catch {
      // Fallback to /dashboard
    }
  }

  redirect({ href: target, locale });
}
