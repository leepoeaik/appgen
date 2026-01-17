'use client';

interface AppSandboxProps {
  htmlCode: string;
  fullscreen?: boolean;
}

export default function AppSandbox({ htmlCode, fullscreen = false }: AppSandboxProps) {
  if (!htmlCode) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
        <p>App Preview will appear here</p>
      </div>
    );
  }

  if (fullscreen) {
    return (
      <iframe
        srcDoc={htmlCode}
        className="h-full w-full border-0"
        title="Generated App"
        // CRITICAL: This allows localStorage to work
        sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-3xl border-8 border-gray-800 bg-white shadow-2xl">
      {/* Phone Notch (Visual Flair) */}
      <div className="mx-auto h-6 w-32 rounded-b-xl bg-gray-800"></div>
      
      <iframe
        srcDoc={htmlCode}
        className="h-[calc(100%-24px)] w-full border-0"
        title="Generated App"
        // CRITICAL: This allows localStorage to work
        sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
      />
    </div>
  );
}

