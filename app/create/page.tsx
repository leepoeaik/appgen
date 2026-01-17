'use client';

import { useState } from 'react';
import AppSandbox from '@/components/AppSandbox';
import Link from 'next/link';

export default function CreateApp() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setGeneratedCode(''); // Clear previous app

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (data.code) {
        setGeneratedCode(data.code);
      }
    } catch (error) {
      alert('Something went wrong generating the app.');
    } finally {
      setLoading(false);
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

