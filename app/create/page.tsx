'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppSandbox from '@/components/AppSandbox';
import Link from 'next/link';
import { saveApp, generateAppId, extractAppNameFromPrompt, getAppById } from '@/lib/appStorage';
import type { AppData } from '@/lib/appStorage';

function CreateAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editAppId = searchParams.get('id');
  
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);
  const [preservedImageUrl, setPreservedImageUrl] = useState<string | undefined>(undefined);
  const [isLoadingExistingApp, setIsLoadingExistingApp] = useState(false);
  const [savedCode, setSavedCode] = useState<string>(''); // Track saved code to detect changes
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [appName, setAppName] = useState<string>(''); // App name for editing
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load existing app if editing
  useEffect(() => {
    if (editAppId) {
      setIsLoadingExistingApp(true);
      const existingApp = getAppById(editAppId);
      if (existingApp) {
        setAppId(existingApp.id);
        setGeneratedCode(existingApp.code);
        setSavedCode(existingApp.code); // Store saved version
        setInitialPrompt(existingApp.initialPrompt);
        setAppName(existingApp.name); // Load app name
        setOriginalCreatedAt(existingApp.createdAt);
        setPreservedImageUrl(existingApp.imageUrl); // Preserve image URL
        setIsEditingMode(true); // Start in editing mode
      } else {
        // App not found, redirect to home
        router.push('/');
      }
      setIsLoadingExistingApp(false);
    }
  }, [editAppId, router]);

  // Check for unsaved changes
  // For new apps: if generatedCode exists but savedCode is empty, it's unsaved
  // For existing apps: if generatedCode differs from savedCode, it's unsaved
  const hasUnsavedChanges = isEditingMode && (
    (savedCode === '' && generatedCode !== '') || // New app with generated code
    (savedCode !== '' && generatedCode !== savedCode) // Existing app with changes
  );

  // Handle browser back button and navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Handle back navigation with confirmation
  const handleBackClick = (e: React.MouseEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      setShowConfirmDialog(true);
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmLeave = () => {
    setShowConfirmDialog(false);
    router.push('/');
  };

  const handleCancelLeave = () => {
    setShowConfirmDialog(false);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setGeneratedCode(''); // Clear previous code
    setSavedCode(''); // Clear saved code for new app
    setInitialPrompt(prompt);
    const newId = generateAppId();
    setAppId(newId);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk !== undefined) {
                // Accumulate chunks
                setGeneratedCode(prev => {
                  const newCode = prev + data.chunk;
                  return newCode;
                });
              }
              if (data.done) {
                // Final code is set, save and navigate to edit page
                if (data.error) {
                  alert(data.error || 'Something went wrong generating the app.');
                  setLoading(false);
                } else if (data.code) {
                  const finalCode = data.code;
                  setGeneratedCode(finalCode);
                  
                  // Auto-save the generated app
                  const appName = extractAppNameFromPrompt(prompt);
                  const appDescription = prompt.length > 100 
                    ? prompt.substring(0, 100) + '...' 
                    : prompt;

                  const generatedAppName = extractAppNameFromPrompt(prompt);
                  const appData: AppData = {
                    id: newId,
                    name: generatedAppName,
                    description: appDescription,
                    code: finalCode,
                    initialPrompt: prompt,
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                  };

                  try {
                    saveApp(appData);
                    setAppName(generatedAppName); // Set app name
                    setSavedCode(finalCode); // Mark as saved
                    setLoading(false);
                    // Navigate to edit page with the app ID to show preview
                    router.push(`/create?id=${newId}`);
                  } catch (error) {
                    console.error('Save error:', error);
                    alert('Failed to save app. Please try again.');
                    setLoading(false);
                  }
                } else {
                  setLoading(false);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Something went wrong generating the app.');
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt || !generatedCode) return;
    setLoading(true);
    const previousCode = generatedCode; // Keep previous code as fallback

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: editPrompt,
          existingCode: generatedCode,
          isEdit: true 
        }),
      });

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      setGeneratedCode(''); // Start fresh for edit

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk !== undefined) {
                // Accumulate chunks
                setGeneratedCode(prev => {
                  const newCode = prev + data.chunk;
                  return newCode;
                });
              }
              if (data.done) {
                // Final code is set
                if (data.error) {
                  alert(data.error || 'Something went wrong editing the app.');
                  setLoading(false);
                } else if (data.code) {
                  setGeneratedCode(data.code);
                  setEditPrompt(''); // Clear edit prompt after applying
                  setLoading(false);
                } else {
                  setLoading(false);
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Edit error:', error);
      setGeneratedCode(previousCode); // Restore previous code on error
      alert('Something went wrong editing the app.');
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedCode || !initialPrompt || !appId) {
      alert('Cannot save: App not generated yet.');
      return;
    }

    const finalAppName = appName.trim() || extractAppNameFromPrompt(initialPrompt);
    const appDescription = initialPrompt.length > 100 
      ? initialPrompt.substring(0, 100) + '...' 
      : initialPrompt;

    const appData: AppData = {
      id: appId,
      name: finalAppName,
      description: appDescription,
      code: generatedCode,
      initialPrompt: initialPrompt,
      // Preserve original createdAt if editing existing app, otherwise use current time
      createdAt: originalCreatedAt || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      // Preserve imageUrl if editing existing app
      imageUrl: preservedImageUrl,
    };

    try {
      saveApp(appData);
      setAppName(finalAppName); // Update app name state
      setSavedCode(generatedCode); // Update saved code after successful save
      router.push('/');
    } catch (error) {
      alert('Failed to save app. Please try again.');
      console.error('Save error:', error);
    }
  };

  // Handle name editing
  const handleNameClick = () => {
    setIsEditingName(true);
    // Focus the input after state update
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
    // Auto-save name if changed
    if (appId && appName.trim()) {
      const existingApp = getAppById(appId);
      if (existingApp && existingApp.name !== appName.trim()) {
        const appData: AppData = {
          ...existingApp,
          name: appName.trim(),
          lastModified: new Date().toISOString(),
        };
        saveApp(appData);
      }
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      // Restore original name on escape
      if (appId) {
        const existingApp = getAppById(appId);
        if (existingApp) {
          setAppName(existingApp.name);
        }
      }
      setIsEditingName(false);
    }
  };

  if (isLoadingExistingApp) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white" style={{ background: 'transparent' }}>
        <div className="text-center">
          <div className="text-lg text-gray-400">Loading app for editing...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col text-white md:flex-row" style={{ background: 'transparent' }}>
      {/* LEFT PANEL: Controls */}
      <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12">
        <div className="mb-6">
          {isEditingMode && hasUnsavedChanges ? (
            <button
              onClick={handleBackClick}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#181818] shadow-md hover:bg-[#282828] transition-colors text-[#3b82f6] hover:text-[#2563eb] mb-4"
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
            </button>
          ) : (
            <Link 
              href="/" 
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#181818] shadow-md hover:bg-[#282828] transition-colors text-[#3b82f6] hover:text-[#2563eb] mb-4"
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
          )}
          <h1 className="text-4xl font-bold tracking-tight text-white">
            App<span className="text-[#3b82f6]">Gen</span>
          </h1>
        </div>

        {!isEditingMode ? (
          // INITIAL GENERATION MODE
          <>
            <p className="mb-8 text-lg text-gray-400">
              Describe a micro-tool you need, and we'll build and deploy it instantly.
            </p>

            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A simple calorie tracker that lets me add food items and calculates total for the day."
                className="text-white bg-[#181818] w-full rounded-xl border border-gray-700 p-4 text-lg shadow-sm focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20"
                rows={4}
              />

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt}
                className={`w-full rounded-xl py-4 text-lg font-semibold text-white transition-all ${
                  loading
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-[#3b82f6] hover:bg-[#2563eb] shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? 'Building your app...' : 'Generate App'}
              </button>
            </div>

            {/* Suggestion Chips */}
            <div className="mt-8">
              <p className="mb-2 text-sm font-medium text-gray-400">Try asking for:</p>
              <div className="flex flex-wrap gap-2">
                {['Workout Tracker', 'Budget Planner', 'Pomodoro Timer'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setPrompt(`I want a ${item}`)}
                    className="rounded-full bg-[#181818] px-4 py-2 text-sm text-white shadow-sm border border-gray-700 hover:bg-[#282828]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          // EDITING MODE
          <>
            {/* Editable App Name */}
            <div className="mb-6 group">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  className="w-full bg-[#181818] border border-[#3b82f6] rounded-lg px-4 py-2 text-xl font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h2
                    onClick={handleNameClick}
                    className="text-2xl font-bold text-white cursor-text hover:text-[#3b82f6] transition-colors select-text"
                    title="Click to edit name"
                  >
                    {appName || 'Untitled App'}
                  </h2>
                  <button
                    onClick={handleNameClick}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#282828]"
                    title="Edit name"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400 hover:text-[#3b82f6]"
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
                </div>
              )}
            </div>

            <p className="mb-8 text-lg text-gray-400">
              {editAppId 
                ? 'Edit and improve your app. Changes will update the existing version when you save.'
                : 'Your app has been generated! You can now edit and improve it, or save it when you\'re satisfied.'}
            </p>

            <div className="space-y-4">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g., Add a dark mode toggle, Change the color scheme to green, Add a reset button, etc."
                className="text-white bg-[#181818] w-full rounded-xl border border-gray-700 p-4 text-lg shadow-sm focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20"
                rows={4}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  disabled={loading || !editPrompt}
                  className={`flex-1 rounded-xl py-4 text-lg font-semibold text-white transition-all ${
                    loading || !editPrompt
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-[#3b82f6] hover:bg-[#2563eb] shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Updating...' : 'Apply Edit'}
                </button>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-[#181818] p-4 border border-gray-700">
              <p className="text-sm text-gray-300">
                <strong>Tip:</strong> You can make multiple edits to refine your app. Each edit builds upon the previous version.
              </p>
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL: Streaming Code Display (Main Focus) */}
      <div className="flex w-full flex-col items-center justify-center p-4 md:w-1/2 md:p-8" style={{ background: 'transparent' }}>
        {!isEditingMode ? (
          // SHOW STREAMING CODE DURING GENERATION (Main Focus)
          <div className="w-full h-full max-h-[calc(100vh-4rem)] flex flex-col rounded-xl bg-[#181818] border border-gray-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-[#0f0f0f]">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-[#3b82f6]' : generatedCode ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className="text-sm font-medium text-gray-300">
                  {loading 
                    ? (generatedCode ? '✨ Generating code live...' : '🚀 Starting generation...')
                    : generatedCode 
                    ? '✅ Code Generation Complete!'
                    : 'Ready to generate'}
                </span>
              </div>
              {generatedCode && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{generatedCode.length.toLocaleString()} characters</span>
                  {loading && <span className="animate-pulse">• Streaming...</span>}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-6 bg-[#0a0a0a]">
              {generatedCode ? (
                <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {generatedCode}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="mb-4 text-6xl animate-pulse">⚡</div>
                    <p className="text-base font-medium">Waiting for code to start streaming...</p>
                    <p className="text-xs mt-2 text-gray-600">Your app will appear here as it's being generated</p>
                  </div>
                </div>
              )}
            </div>
            {generatedCode && !loading && (
              <div className="p-4 border-t border-gray-700 bg-[#0f0f0f]">
                <p className="text-xs text-gray-400 text-center">
                  🎉 Code generation complete! Redirecting to preview...
                </p>
              </div>
            )}
          </div>
        ) : (
          // SHOW PREVIEW IN EDIT MODE
          <div className="relative h-[800px] w-full max-w-[400px]">
            <AppSandbox htmlCode={generatedCode} />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-[#181818] border border-gray-700 shadow-2xl p-6">
            <h2 className="mb-4 text-xl font-bold text-white">
              Unsaved Changes
            </h2>
            <p className="mb-6 text-gray-300">
              You have unsaved changes. If you leave now, all unsaved changes will be discarded. Are you sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelLeave}
                className="flex-1 rounded-xl bg-[#282828] px-4 py-3 font-semibold text-white transition-all hover:bg-[#383838] border border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition-all hover:bg-red-700 shadow-lg"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CreateApp() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center text-white" style={{ background: 'transparent' }}>
        <div className="text-center">
          <div className="text-lg text-gray-400">Loading...</div>
        </div>
      </main>
    }>
      <CreateAppContent />
    </Suspense>
  );
}
