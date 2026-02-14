"use client";

import { useState } from "react";
import {
  isColorOption,
  resolveDisplayColor,
} from "@/lib/color-utils";
import { resolveImageUrl } from "@/lib/image-url";
import { ImageLightbox } from "./image-lightbox";

interface OptionValue {
  id: number;
  name: string | null;
  vid: string | null;
  is_color: number | null;
  color: string | null;
  image_url: string | null;
}

interface Option {
  id: number;
  type: string | null;
  pid: string | null;
  is_color: number | null;
  source: string | null;
  values: OptionValue[];
}

interface OptionsDisplayProps {
  options: Option[];
}

export function OptionsDisplay({ options }: OptionsDisplayProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No product options available.
      </p>
    );
  }

  /** Collect all images from an option's values and open the lightbox at the clicked index */
  function openLightbox(optionValues: OptionValue[], clickedIndex: number) {
    const images = optionValues
      .filter((v) => !!v.image_url)
      .map((v) => v.image_url!);
    if (images.length === 0) return;
    setLightboxImages(images);
    setLightboxIndex(clickedIndex);
    setLightboxOpen(true);
  }

  return (
    <>
      <div className="space-y-4">
        {options.map((opt) => {
          const optIsColor = isColorOption(opt.is_color, opt.type);
          // Track image index within this option for lightbox navigation
          let imageIdx = -1;

          return (
            <div key={opt.id}>
              <h4 className="mb-2 text-sm font-medium text-foreground">
                {opt.type || `Option ${opt.pid || opt.id}`}
                {optIsColor && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Color)
                  </span>
                )}
              </h4>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((val) => {
                  const valIsColor =
                    optIsColor || isColorOption(val.is_color, null);
                  const displayColor = resolveDisplayColor(
                    val.color,
                    val.name,
                    valIsColor
                  );
                  const hasImage = !!val.image_url;
                  if (hasImage) imageIdx++;
                  const currentImageIdx = imageIdx;

                  return (
                    <div
                      key={val.id}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
                    >
                      {hasImage && (
                        <button
                          type="button"
                          className="flex-shrink-0 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          onClick={() =>
                            openLightbox(opt.values, currentImageIdx)
                          }
                        >
                          <img
                            src={resolveImageUrl(val.image_url) || ""}
                            alt={val.name || ""}
                            className="h-8 w-8 rounded object-cover border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          />
                        </button>
                      )}
                      {displayColor && !hasImage && (
                        <span
                          className="relative h-6 w-6 rounded-full border shadow-sm flex-shrink-0"
                          style={{ backgroundColor: displayColor }}
                          title={`${val.name || ""} (${displayColor})`}
                        >
                          {displayColor === "#FFFFFF" && (
                            <span className="absolute inset-0 rounded-full border border-gray-300" />
                          )}
                        </span>
                      )}
                      {displayColor && hasImage && (
                        <span
                          className="h-4 w-4 rounded-full border shadow-sm flex-shrink-0"
                          style={{ backgroundColor: displayColor }}
                          title={displayColor}
                        />
                      )}
                      <span className="text-sm">
                        {val.name || val.vid || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
