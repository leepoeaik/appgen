'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllApps, deleteApp, saveApp } from '@/lib/appStorage';
import type { AppData } from '@/lib/appStorage';

export default function Home() {
  const router = useRouter();
  const [apps, setApps] = useState<AppData[]>([]);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  const handleEditClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/create?id=${id}`);
  };

  const handleImageClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingImageId(id);
    const fileInput = fileInputRefs.current[id];
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const allApps = getAllApps();
      const appIndex = allApps.findIndex(a => a.id === id);
      
      if (appIndex >= 0) {
        allApps[appIndex].imageUrl = imageUrl;
        saveApp(allApps[appIndex]);
        // Refresh the apps list from storage
        setApps(getAllApps());
      }
    };
    reader.readAsDataURL(file);
    
    // Reset the input so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
    setEditingImageId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getDefaultGradient = (id: string) => {
    // Generate a consistent gradient based on app ID
    const hash = id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ];
    return colors[hash % colors.length];
  };

  return (
    <main className="min-h-screen text-white" style={{ background: 'transparent' }}>
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-2">
              App<span className="text-[#3b82f6]">Gen</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg">
              Your micro-tools dashboard
            </p>
          </div>
          <Link
            href="/create"
            className="rounded-full bg-[#3b82f6] px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-bold text-white transition-all hover:bg-[#2563eb] hover:scale-105 shadow-lg w-full sm:w-auto text-center"
          >
            Create New
          </Link>
        </div>

        {/* Apps Grid - Spotify Album Style */}
        {apps.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-700 bg-[#181818] p-16 text-center hover:bg-[#282828] transition-colors">
            <svg
              className="mx-auto h-16 w-16 text-gray-500"
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
            <h3 className="mt-6 text-xl font-semibold text-white">No apps yet</h3>
            <p className="mt-2 text-sm text-gray-400">
              Get started by creating your first micro-tool
            </p>
            <div className="mt-8">
              <Link
                href="/create"
                className="inline-flex items-center rounded-full bg-[#3b82f6] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#2563eb] transition-colors"
              >
                Create New App
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="group"
              >
                {/* Album Card */}
                <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-[#181818] p-4 transition-all hover:bg-[#282828]">
                  {/* Image or Gradient */}
                  <div
                    className="relative h-full w-full rounded-lg shadow-lg cursor-pointer"
                    onClick={() => handleOpenApp(app.id)}
                    style={{
                      background: app.imageUrl 
                        ? `url(${app.imageUrl}) center/cover` 
                        : getDefaultGradient(app.id),
                    }}
                  >
                    {/* Edit Icon - Pencil on top right */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditClick(app.id, e);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white opacity-100 md:opacity-0 transition-opacity hover:bg-black/90 md:group-hover:opacity-100"
                      title="Edit app"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {/* Image Upload Button - Hidden input */}
                    <input
                      ref={(el) => { fileInputRefs.current[app.id] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(app.id, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    />

                    {/* Upload Image Button - Bottom left, appears on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleImageClick(app.id, e);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute bottom-2 left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white opacity-100 md:opacity-0 transition-opacity hover:bg-black/90 md:group-hover:opacity-100"
                      title="Upload image"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Details Section - Bottom */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-semibold text-white text-base mb-1 group-hover:text-[#3b82f6] transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      Created {formatDate(app.createdAt)}
                    </p>
                  </div>
                  
                  {/* Delete Button - Trash can icon */}
                  <button
                    onClick={(e) => handleDeleteApp(app.id, e)}
                    className="flex-shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-[#282828] hover:text-white"
                    title="Delete app"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
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
