import React, { useEffect } from "react";

interface ImageLightboxProps {
  images: string[];
  isOpen: boolean;
  startIndex?: number;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, isOpen, startIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = React.useState(startIndex);

  useEffect(() => {
    if (isOpen) setCurrentIndex(startIndex);
  }, [isOpen, startIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrentIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen) return null;

  const goPrev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setCurrentIndex((i) => (i + 1) % images.length);

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative max-w-6xl w-full">
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm"
          >
            Close ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl px-4"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                onClick={goNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-3xl px-4"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
          <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
            <img
              src={images[currentIndex]}
              alt="Preview"
              className="w-full max-h-[80vh] object-contain select-none"
              draggable={false}
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 text-center text-white/80 text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;


