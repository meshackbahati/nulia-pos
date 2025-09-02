import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken, hasPermission } from '@/lib/auth';

export async function requireAuth(allowedRoles?: string[]) {
  const headersList = headers();
  const authHeader = headersList.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    redirect('/auth/login');
  }

  try {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (allowedRoles && allowedRoles.length > 0) {
      const hasAccess = allowedRoles.some(role => hasPermission(payload.role, role));
      if (!hasAccess) {
        redirect('/auth/unauthorized');
      }
    }

    return payload;
  } catch (error) {
    redirect('/auth/login');
  }
}

export async function getAuthUser() {
  const headersList = headers();
  const authHeader = headersList.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}