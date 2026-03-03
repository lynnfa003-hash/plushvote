"use client";

import { useCallback, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { uiCopy } from "@/lib/i18n";

export type UploadedImage = {
  id: string;
  file: File;
  preview: string;
  status: "idle" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
};

type ImageUploadProps = {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in bytes
};

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
  maxFileSize = MAX_FILE_SIZE
}: ImageUploadProps) {
  const { locale } = useLocale();
  const text = uiCopy[locale];
  const [isDragging, setIsDragging] = useState(false);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.has(file.type)) {
        return locale === "zh" ? "仅支持 PNG/JPG/WebP 格式" : "Only PNG/JPG/WebP allowed";
      }
      if (file.size > maxFileSize) {
        return locale === "zh" ? "图片大小不能超过 5MB" : "Image size must be under 5MB";
      }
      return null;
    },
    [locale, maxFileSize]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) return;

      const filesArray = Array.from(files).slice(0, remainingSlots);
      const newImages: UploadedImage[] = [];

      for (const file of filesArray) {
        const error = validateFile(file);
        if (error) {
          newImages.push({
            id: generateId(),
            file,
            preview: "",
            status: "error",
            error
          });
        } else {
          newImages.push({
            id: generateId(),
            file,
            preview: URL.createObjectURL(file),
            status: "idle"
          });
        }
      }

      onImagesChange([...images, ...newImages]);
    },
    [images, maxImages, onImagesChange, locale, maxFileSize]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeImage = useCallback(
    (id: string) => {
      const image = images.find((img) => img.id === id);
      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }
      onImagesChange(images.filter((img) => img.id !== id));
    },
    [images, onImagesChange]
  );

  const reorderImages = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const draggedImage = images[dragIndex];
      const newImages = [...images];
      newImages.splice(dragIndex, 1);
      newImages.splice(hoverIndex, 0, draggedImage);
      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  const canAddMore = images.length < maxImages;
  const validImages = images.filter((img) => img.status !== "error");
  const errorImages = images.filter((img) => img.status === "error");

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative rounded-2xl border-2 border-dashed p-8 transition-all duration-200
            ${isDragging
              ? "border-brand-primary bg-brand-primary/5 scale-[1.02]"
              : "border-brand-shapeBlue bg-brand-bg hover:border-brand-primary/50 hover:bg-brand-bg"
            }
          `}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-xl bg-brand-primary/10 p-3">
              <svg
                className="h-8 w-8 text-brand-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-brand-textDark">
                {isDragging
                  ? locale === "zh" ? "松开以上传图片" : "Drop images here"
                  : locale === "zh" ? "点击或拖拽上传图片" : "Click or drag images here"
                }
              </p>
              <p className="text-xs text-brand-textMuted">
                {locale === "zh"
                  ? `支持 PNG/JPG/WebP，最大 5MB，最多 ${maxImages} 张`
                  : `PNG/JPG/WebP up to 5MB, max ${maxImages} images`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Counter */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-textMuted">
          {locale === "zh"
            ? `已添加 ${validImages.length}/${maxImages} 张图片`
            : `${validImages.length}/${maxImages} images added`}
        </span>
        {validImages.length > 0 && (
          <span className="text-xs text-brand-textMuted">
            {locale === "zh" ? "拖拽可调整顺序" : "Drag to reorder"}
          </span>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image, index) => (
            <ImageItem
              key={image.id}
              image={image}
              index={index}
              onRemove={removeImage}
              onReorder={reorderImages}
              isFirst={index === 0}
              total={images.length}
            />
          ))}
        </div>
      )}

      {/* Error Images Alert */}
      {errorImages.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="mb-2 text-xs font-bold text-rose-700">
            {locale === "zh" ? "以下文件上传失败:" : "Failed to process:"}
          </p>
          <ul className="space-y-1">
            {errorImages.map((img) => (
              <li key={img.id} className="flex items-center justify-between text-xs text-rose-600">
                <span className="truncate">{img.file.name}</span>
                <button
                  onClick={() => removeImage(img.id)}
                  className="ml-2 font-bold hover:text-rose-800"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Individual Image Item Component
function ImageItem({
  image,
  index,
  onRemove,
  onReorder,
  isFirst,
  total
}: {
  image: UploadedImage;
  index: number;
  onRemove: (id: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  isFirst: boolean;
  total: number;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(index));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData("text/plain"));
    if (dragIndex !== index) {
      onReorder(dragIndex, index);
    }
    setIsDragging(false);
  };

  if (image.status === "error") {
    return null; // Error images are shown in a separate list
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        group relative aspect-square cursor-move overflow-hidden rounded-xl
        ${isDragging ? "opacity-50 ring-2 ring-brand-primary" : ""}
        ${isFirst ? "ring-2 ring-brand-primary ring-offset-2" : ""}
      `}
    >
      {/* Main Image */}
      {image.preview ? (
        <img
          src={image.preview}
          alt={image.file.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-brand-shapeBlue">
          <span className="text-xs text-brand-textMuted">No preview</span>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* First Badge */}
      {isFirst && (
        <div className="absolute left-2 top-2 rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
          封面
        </div>
      )}

      {/* Index Badge */}
      <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
        {index + 1}
      </div>

      {/* Status Indicator */}
      {image.status === "uploading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}

      {image.status === "done" && (
        <div className="absolute bottom-2 left-2 rounded-full bg-emerald-500 p-1">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={() => onRemove(image.id)}
        className="absolute bottom-2 right-2 rounded-full bg-rose-500 p-1.5 text-white opacity-0 shadow-lg transition-all hover:bg-rose-600 group-hover:opacity-100"
        title="Remove"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* File Name Tooltip */}
      <div className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {image.file.name}
      </div>
    </div>
  );
}
