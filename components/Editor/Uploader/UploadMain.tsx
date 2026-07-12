'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { persistImage } from '@/app/editor/hooks/useAutosave'

interface UploadMainProps { }

export default function UploadMain({ }: UploadMainProps) {
    const uploadImage = useEditorStore(state => state.uploadImage)
    const originalImage = useEditorStore(state => state.originalImage)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const result = e.target?.result
                if (typeof result === 'string') {
                    // Create an image object to verify/get dimensions if needed
                    const img = new Image()
                    img.src = result
                    img.onload = () => {
                        uploadImage(result)
                        // The image is the one piece of state the snapshot autosave
                        // doesn't carry - persist it explicitly on upload
                        persistImage(result)
                    }
                }
            }
            reader.readAsDataURL(file)
        }
    }, [uploadImage])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        maxFiles: 1
    })

    if (originalImage) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={originalImage}
                        alt="Uploaded preview"
                        className="w-full h-full object-contain"
                    />

                    {/* Overlay Button */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            {...getRootProps()}
                            className="pointer-events-auto px-8 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 text-white font-bold shadow-2xl transition-all flex items-center gap-3"
                        >
                            <input {...getInputProps()} />
                            <Upload size={20} />
                            Change Image
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                {...getRootProps()}
                className={`
          flex flex-col items-center justify-center p-12 lg:p-16 text-center
          rounded-3xl border-2 border-dashed cursor-pointer
          transition-all duration-300 group
          ${isDragActive
                        ? 'border-pink-500 bg-pink-500/10 scale-[1.02]'
                        : 'border-white/10 hover:border-pink-500/50 hover:bg-white/5'
                    }
        `}
            >
                <input {...getInputProps()} />

                <div className={`
          w-20 h-20 mb-6 rounded-2xl flex items-center justify-center
          transition-all duration-500
          ${isDragActive ? 'bg-pink-500 text-white rotate-12 scale-110' : 'bg-white/5 text-pink-500 group-hover:scale-110 group-hover:rotate-6'}
        `}>
                    {isDragActive ? (
                        <Upload size={40} className="animate-bounce" />
                    ) : (
                        <ImageIcon size={40} />
                    )}
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                    {isDragActive ? 'Drop it like it\'s hot!' : 'Upload your photo'}
                </h3>

                <p className="text-gray-400 text-lg mb-8 max-w-xs">
                    Drag and drop your image here, or click to browse files
                </p>

                <div className={`
          px-6 py-3 rounded-xl font-semibold text-sm transition-all
          ${isDragActive
                        ? 'bg-white text-pink-600 shadow-lg'
                        : 'bg-white/10 text-white group-hover:bg-pink-600 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]'
                    }
        `}>
                    Select File
                </div>
            </div>
        </div>
    )
}
