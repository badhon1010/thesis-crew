import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, Check } from "lucide-react";
import { getCroppedImgBase64 } from "@/utils/cropImage";

interface ImageCropperModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (base64Url: string) => void;
}

export function ImageCropperModal({ imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsCropping(true);
    setErrorMsg(null);
    try {
      const base64Url = await getCroppedImgBase64(imageSrc, croppedAreaPixels);
      onCropComplete(base64Url);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to crop image. Please try again.");
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#181818]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-[#2A2A2A]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Adjust Image</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2A2A2A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative h-64 w-full bg-slate-900 sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls & Actions */}
        <div className="p-4">
          <div className="mb-6 flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
            />
          </div>
          
          {errorMsg && (
            <div className="mb-4 text-sm font-medium text-red-500">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#2A2A2A]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isCropping}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isCropping ? "Processing..." : (
                <>
                  <Check className="h-4 w-4" /> Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
