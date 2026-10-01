'use client'

import { useDropzone } from 'react-dropzone'
import { ImagePlus, Loader2, Upload } from 'lucide-react'
import { useStartProject } from '@/features/editor/hooks/useStartProject'
import { primaryButton } from '../common/ui'

/** The photo target of the Start screen: a photo always starts a new project. */
export default function PhotoDropzone() {
  const { start, isProcessing } = useStartProject()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      if (files[0]) void start(files[0])
    },
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    disabled: isProcessing,
  })

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center gap-4 lg:gap-5 px-6 py-8 lg:py-0 lg:h-[300px] rounded-[28px] border-2 border-dashed text-center transition-colors ${
        isProcessing
          ? 'border-white/10 bg-white/[0.02] cursor-progress'
          : isDragActive
            ? 'border-accent-pink bg-accent-pink/10 cursor-copy'
            : 'border-white/[0.16] bg-white/[0.025] hover:border-accent-pink/50 hover:bg-white/[0.04] cursor-pointer'
      }`}
    >
      <input {...getInputProps()} aria-label="Choose a photo" />
      <span className="w-16 h-16 lg:w-[76px] lg:h-[76px] rounded-[22px] bg-accent-pink/[0.12] text-accent-pink flex items-center justify-center shadow-[0_0_40px_rgb(var(--pink-rgb)/0.18)]">
        {isProcessing ? <Loader2 size={32} className="animate-spin" /> : <ImagePlus size={34} strokeWidth={1.8} />}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-lg lg:text-[22px] font-semibold text-white">
          {isProcessing ? 'Preparing your photo…' : isDragActive ? 'Drop it here' : (
            <>
              <span className="lg:hidden">Take or choose a photo</span>
              <span className="hidden lg:inline">Drop a photo here</span>
            </>
          )}
        </span>
        <span className="text-sm text-white/60">PNG, JPG or WEBP</span>
      </span>
      <span className={`${primaryButton} h-11 px-5 text-[15px] hidden lg:inline-flex`} aria-hidden>
        <Upload size={18} />
        Choose photo
      </span>
    </div>
  )
}
