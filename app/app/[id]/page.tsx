'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppSandbox from '@/components/AppSandbox';
import { getAppById } from '@/lib/appStorage';
import type { AppData } from '@/lib/appStorage';
import Link from 'next/link';

export default function AppViewer() {
  const params = useParams();
  const router = useRouter();
  const [app, setApp] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id || typeof params.id !== 'string') {
      router.push('/');
      return;
    }

    const appData = getAppById(params.id);
    if (!appData) {
      router.push('/');
      return;
    }

    setApp(appData);
    setLoading(false);
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading app...</div>
        </div>
      </main>
    );
  }

  if (!app) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
              <p className="mt-1 text-sm text-gray-600">{app.description}</p>
            </div>
          </div>
        </div>

        {/* App Preview */}
        <div className="flex items-center justify-center bg-gray-200 p-4 md:p-8">
          <div className="relative h-[800px] w-full max-w-[400px]">
            <AppSandbox htmlCode={app.code} />
          </div>
        </div>
      </div>
    </main>
  );
}
