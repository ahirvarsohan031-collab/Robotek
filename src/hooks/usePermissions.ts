import useSWR from 'swr';
import { useSession } from 'next-auth/react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function usePermissions() {
  const { data: session, status } = useSession();
  
  // @ts-ignore
  const userId = session?.user?.id;
  // @ts-ignore
  const initialPermissions = session?.user?.permissions || [];
  // @ts-ignore
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const { data, error, isLoading } = useSWR(
    userId ? `/api/users/${userId}/permissions` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
    }
  );

  return {
    permissions: data?.permissions || initialPermissions,
    isAdmin,
    isLoading: isLoading || status === "loading",
    error
  };
}
