"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type AssetGalleryProps = {
  title: string;
  images: string[];
  badges: string[];
};

export function AssetGallery({
  title,
  images,
  badges,
}: AssetGalleryProps) {
  const galleryImages = images.length > 0 ? images : [""];
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleImages = galleryImages.length > 1;

  const showPrevious = () => {
    setCurrentIndex((index) =>
      index === 0 ? galleryImages.length - 1 : index - 1,
    );
  };
  const showNext = () => {
    setCurrentIndex((index) => (index + 1) % galleryImages.length);
  };

  return (
    <section className="asset-gallery" aria-label={`${title} 사진 갤러리`}>
      <div className="detail-image">
        <Image
          src={galleryImages[currentIndex]}
          alt={`${title} 사진 ${currentIndex + 1}`}
          fill
          sizes="(max-width: 960px) 100vw, 820px"
          priority={currentIndex === 0}
          unoptimized
        />
        <div className="asset-origin-badges">
          {badges.filter(Boolean).map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
        {hasMultipleImages ? (
          <>
            <button
              className="gallery-arrow gallery-arrow-previous"
              type="button"
              onClick={showPrevious}
              aria-label="이전 사진"
              title="이전 사진"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className="gallery-arrow gallery-arrow-next"
              type="button"
              onClick={showNext}
              aria-label="다음 사진"
              title="다음 사진"
            >
              <ChevronRight size={22} />
            </button>
            <span className="gallery-counter">
              사진 {currentIndex + 1} / {galleryImages.length}
            </span>
          </>
        ) : null}
      </div>
      {hasMultipleImages ? (
        <div className="gallery-thumbnails" aria-label="사진 선택">
          {galleryImages.map((image, index) => (
            <button
              className={index === currentIndex ? "is-active" : undefined}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`${index + 1}번 사진 보기`}
              aria-pressed={index === currentIndex}
              key={image}
            >
              <Image
                src={image}
                alt=""
                width={84}
                height={56}
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
