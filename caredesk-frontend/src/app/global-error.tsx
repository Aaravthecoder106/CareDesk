"use client";

import Link from "next/link";
import { Heart, ArrowLeft, RefreshCw } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-blue-bg to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="text-2xl font-bold text-navy">
              care<span className="text-blue">desk</span>
            </span>
          </div>
          <h1 className="text-6xl font-bold text-red-500 mb-4">!</h1>
          <h2 className="text-xl font-bold text-navy mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-8">
            An unexpected error occurred. Please try again.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-navy text-white font-semibold rounded-lg hover:bg-navy-light transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-navy font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
