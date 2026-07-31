"use client";

import { useState } from "react";

/**
 * Full-screen viewer for a single attachment.
 *
 * HEIC uploaded from a browser that couldn't convert it (Chrome and Firefox
 * can't decode HEIC, so compression falls back to the original) won't render
 * here either — hence the download fallback on error.
 */
export default function AttachmentLightbox({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {failed ? (
        <div
          className="flex flex-col items-center gap-3 text-white text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm opacity-80">
            This file can&apos;t be previewed in the browser
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-gray-900 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Download file
          </a>
        </div>
      ) : (
        // Plain img by choice: arbitrary Supabase Storage URLs, and the error
        // fallback depends on the native onError event.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Attachment"
          className="max-w-full max-h-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
          onError={() => setFailed(true)}
        />
      )}

      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl leading-none hover:opacity-70"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}
