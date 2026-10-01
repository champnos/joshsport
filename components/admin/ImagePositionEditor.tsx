"use client";

import { useRef, useState } from "react";
import { clampPercent, formatImagePosition, parseImagePosition, type DisplayFrame } from "@/lib/slideshow-images";

interface ImagePositionEditorProps {
  imageUrl: string;
  position: string;
  frames: DisplayFrame[];
  saving?: boolean;
  onSave: (position: string) => void;
  onCancel: () => void;
}

export default function ImagePositionEditor({ imageUrl, position, frames, saving = false, onSave, onCancel }: ImagePositionEditorProps) {
  const initial = parseImagePosition(position) ?? { x: 50, y: 50 };
  const [x, setX] = useState(initial.x);
  const [y, setY] = useState(initial.y);
  const draggingRef = useRef(false);
  const currentPosition = formatImagePosition(x, y);

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setX(clampPercent(((event.clientX - rect.left) / rect.width) * 100));
    setY(clampPercent(((event.clientY - rect.top) / rect.height) * 100));
  };

  return (
    <div className="space-y-4 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-4 text-gray-700">
      <div>
        <p className="text-sm font-semibold text-brand-blue">Adjust crop</p>
        <p className="text-xs text-gray-600">
          Click or drag on the full photo to set the focus point (e.g. Josh&apos;s face), or use the sliders. The previews show exactly how the photo is cropped on the live site.
        </p>
      </div>

      <div className="flex justify-center rounded-lg bg-gray-200">
        <div
          className="relative inline-block cursor-crosshair touch-none select-none overflow-hidden"
          aria-hidden="true"
          onPointerDown={(event) => {
            draggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (draggingRef.current) updateFromPointer(event);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
        >
          <img src={imageUrl} alt="Full photo" className="block h-auto max-h-[28rem] w-auto max-w-full" draggable={false} />
          <div
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-gold/70 shadow-[0_0_0_2px_rgba(1,34,85,0.8)]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-700">
          Horizontal ({x}%)
          <input
            type="range"
            min={0}
            max={100}
            value={x}
            onChange={(event) => setX(Number(event.target.value))}
            className="mt-1 w-full accent-brand-gold"
          />
        </label>
        <label className="block text-xs font-medium text-gray-700">
          Vertical ({y}%)
          <input
            type="range"
            min={0}
            max={100}
            value={y}
            onChange={(event) => setY(Number(event.target.value))}
            className="mt-1 w-full accent-brand-gold"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[3fr_2fr] sm:items-end">
        {frames.map((frame) => (
          <div key={frame.label}>
            <p className="mb-1 text-xs font-medium text-gray-600">{frame.label} preview</p>
            <div
              className="w-full overflow-hidden rounded-lg bg-gray-200"
              style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
            >
              <img src={imageUrl} alt={`${frame.label} preview`} className="h-full w-full object-cover" style={{ objectPosition: currentPosition }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave(currentPosition)}
          disabled={saving}
          className="text-xs px-3 py-2 rounded-lg font-semibold bg-brand-gold text-brand-blue hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save position"}
        </button>
        <button
          type="button"
          onClick={() => {
            setX(50);
            setY(50);
          }}
          disabled={saving}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
        >
          Reset to centre
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
