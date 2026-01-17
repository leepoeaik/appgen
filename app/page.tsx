'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllApps, deleteApp } from '@/lib/appStorage';
import type { AppData } from '@/lib/appStorage';

export default function Home() {
  const router = useRouter();
  const [apps, setApps] = useState<AppData[]>([]);

  useEffect(() => {
    const loadedApps = getAllApps();
    setApps(loadedApps);
  }, []);

  const handleOpenApp = (id: string) => {
    router.push(`/app/${id}`);
  };

  const handleDeleteApp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this app?')) {
      deleteApp(id);
      setApps(getAllApps());
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              App<span className="text-blue-600">Gen</span>
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Your micro-tools dashboard
            </p>
          </div>
          <Link
            href="/create"
            className="rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
          >
            Create New
          </Link>
        </div>

        {/* Apps Grid */}
        {apps.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No apps yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by creating your first micro-tool
            </p>
            <div className="mt-6">
              <Link
                href="/create"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Create New App
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-lg border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{app.description}</p>
                    <p className="mt-4 text-xs text-gray-400">
                      Created {formatDate(app.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => handleOpenApp(app.id)}
                    className="flex-1 rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Open
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/create?id=${app.id}`);
                    }}
                    className="rounded-md bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={(e) => handleDeleteApp(app.id, e)}
                    className="rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
