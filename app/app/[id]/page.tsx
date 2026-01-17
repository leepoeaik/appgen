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
    <main className="min-h-screen bg-white">
      {/* Back Button - Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors text-blue-600 hover:text-blue-700"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
      </div>

      {/* App Preview - Fullscreen on mobile, centered on desktop */}
      <div className="md:flex md:items-center md:justify-center md:bg-gray-200 md:p-4 lg:p-8">
        <div className="fixed inset-0 md:relative md:h-[800px] md:w-full md:max-w-[400px]">
          <AppSandbox htmlCode={app.code} fullscreen={true} />
        </div>
      </div>
    </main>
  );
}
