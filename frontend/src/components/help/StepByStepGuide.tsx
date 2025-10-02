// components/help/StepByStepGuide.tsx

import React from "react";
import { HelpStep } from "@/lib/helpTypes";
import ImageLightbox from "@/components/common/ImageLightbox";

interface StepByStepGuideProps {
  steps: HelpStep[];
}

const StepByStepGuide: React.FC<StepByStepGuideProps> = ({ steps }) => {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxImage, setLightboxImage] = React.useState<string | null>(null);

  const openLightbox = (image: string) => {
    setLightboxImage(image);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImage(null);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Step-by-Step Guide
      </h2>

      {steps.map((step) => (
        <div key={step.number} className="flex gap-6">
          {/* Step Number */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {step.number}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {step.description}
            </p>

            {/* Step Image */}
            <button
              type="button"
              onClick={() => openLightbox(step.image)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-md group focus:outline-none focus:ring-2 focus:ring-brand-500"
              title="Click to enlarge"
            >
              <div className="relative bg-gray-100 dark:bg-gray-800 h-48 flex items-center justify-center">
                <img
                  src={step.image}
                  alt={step.alt}
                  className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white">Click to zoom</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                  {step.alt}
                </p>
              </div>
            </button>
          </div>
        </div>
      ))}

      <ImageLightbox
        images={lightboxImage ? [lightboxImage] : []}
        isOpen={lightboxOpen}
        startIndex={0}
        onClose={closeLightbox}
      />
    </div>
  );
};

export default StepByStepGuide;
