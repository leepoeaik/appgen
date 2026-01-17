'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppSandbox from '@/components/AppSandbox';
import Link from 'next/link';
import { saveApp, generateAppId, extractAppNameFromPrompt } from '@/lib/appStorage';
import type { AppData } from '@/lib/appStorage';

export default function CreateApp() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (data.code) {
        setGeneratedCode(data.code);
        setInitialPrompt(prompt);
        setIsEditingMode(true);
        setPrompt(''); // Clear initial prompt after generation
        const newId = generateAppId();
        setAppId(newId);
      }
    } catch (error) {
      alert('Something went wrong generating the app.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt || !generatedCode) return;
    setLoading(true);

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

      const data = await res.json();
      if (data.code) {
        setGeneratedCode(data.code);
        setEditPrompt(''); // Clear edit prompt after applying
      }
    } catch (error) {
      alert('Something went wrong editing the app.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedCode || !initialPrompt || !appId) {
      alert('Cannot save: App not generated yet.');
      return;
    }

    const appName = extractAppNameFromPrompt(initialPrompt);
    const appDescription = initialPrompt.length > 100 
      ? initialPrompt.substring(0, 100) + '...' 
      : initialPrompt;

    const appData: AppData = {
      id: appId,
      name: appName,
      description: appDescription,
      code: generatedCode,
      initialPrompt: initialPrompt,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    try {
      saveApp(appData);
      router.push('/');
    } catch (error) {
      alert('Failed to save app. Please try again.');
      console.error('Save error:', error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      {/* LEFT PANEL: Controls */}
      <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12">
        <div className="mb-6">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            App<span className="text-blue-600">Gen</span>
          </h1>
        </div>

        {!isEditingMode ? (
          // INITIAL GENERATION MODE
          <>
            <p className="mb-8 text-lg text-gray-600">
              Describe a micro-tool you need, and we'll build and deploy it instantly.
            </p>

            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A simple calorie tracker that lets me add food items and calculates total for the day."
                className="text-black w-full rounded-xl border border-gray-200 p-4 text-lg shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                rows={4}
              />

              <button
                onClick={handleGenerate}
                disabled={loading || !prompt}
                className={`w-full rounded-xl py-4 text-lg font-semibold text-white transition-all ${
                  loading
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? 'Building your app...' : 'Generate App'}
              </button>
            </div>

            {/* Suggestion Chips */}
            <div className="mt-8">
              <p className="mb-2 text-sm font-medium text-gray-500">Try asking for:</p>
              <div className="flex flex-wrap gap-2">
                {['Workout Tracker', 'Budget Planner', 'Pomodoro Timer'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setPrompt(`I want a ${item}`)}
                    className="rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50"
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
            <p className="mb-8 text-lg text-gray-600">
              Your app has been generated! You can now edit and improve it, or save it when you're satisfied.
            </p>

            <div className="space-y-4">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g., Add a dark mode toggle, Change the color scheme to green, Add a reset button, etc."
                className="text-black w-full rounded-xl border border-gray-200 p-4 text-lg shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                rows={4}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  disabled={loading || !editPrompt}
                  className={`flex-1 rounded-xl py-4 text-lg font-semibold text-white transition-all ${
                    loading || !editPrompt
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
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

            <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> You can make multiple edits to refine your app. Each edit builds upon the previous version.
              </p>
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL: The Phone Preview */}
      <div className="flex w-full items-center justify-center bg-gray-200 p-4 md:w-1/2 md:p-8">
        <div className="relative h-[800px] w-full max-w-[400px]">
          <AppSandbox htmlCode={generatedCode} />
        </div>
      </div>
    </main>
  );
}
