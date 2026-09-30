'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { downscaleForUpload } from '@/lib/image/decode'
import { useUser } from '@/features/account/useUser'
import { useProjects } from '@/features/editor/hooks/useProjects'
import { writeDraftImage } from '@/features/editor/store/draft'
import { uploadImage } from '@/features/editor/store/editor'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'

/**
 * Photo upload. The image is immutable per project: uploading while a project is open starts a new project
 * (the open one keeps its image). Signed in, the upload creates the project right away; anonymous, it becomes
 * the local draft (image in IndexedDB, document via autosave).
 */
export default function UploadMain() {
    const imageSrc = useProjectStore(state => state.imageSrc)
    const projectId = useProjectStore(state => state.projectId)
    const { user } = useUser()
    const { createFromDraft, startNewProject } = useProjects()
    const [isProcessing, setIsProcessing] = useState(false)

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return
        setIsProcessing(true)
        try {
            const blob = await downscaleForUpload(file)
            if (useProjectStore.getState().projectId) await startNewProject()
            uploadImage(blob)
            await writeDraftImage(blob)
            if (user) await createFromDraft(useDocumentStore.getState().name)
        } catch (error) {
            console.error('[upload] failed:', error)
            toast.error('Could not read that image. Please try another file.')
        } finally {
            setIsProcessing(false)
        }
    }, [user, createFromDraft, startNewProject])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        maxFiles: 1,
        disabled: isProcessing,
    })

    if (imageSrc) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageSrc}
                        alt="Uploaded preview"
                        className="w-full h-full object-contain"
                    />

                    {/* Overlay Button */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            {...getRootProps()}
                            className="pointer-events-auto px-8 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 text-white font-bold shadow-2xl transition-all flex items-center gap-3 disabled:opacity-60"
                            disabled={isProcessing}
                        >
                            <input {...getInputProps()} />
                            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                            {projectId ? 'Start new project' : 'Change image'}
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
          flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 text-center
          rounded-3xl border-2 border-dashed cursor-pointer
          transition-all duration-300 group
          ${isDragActive
                        ? 'border-accent-pink bg-accent-pink/10 scale-[1.02]'
                        : 'border-white/10 hover:border-accent-pink/50 hover:bg-white/5'
                    }
        `}
            >
                <input {...getInputProps()} />

                <div className={`
          w-20 h-20 mb-6 rounded-2xl flex items-center justify-center
          transition-all duration-500
          ${isDragActive ? 'bg-accent-pink text-white rotate-12 scale-110' : 'bg-white/5 text-accent-pink group-hover:scale-110 group-hover:rotate-6'}
        `}>
                    {isProcessing ? (
                        <Loader2 size={40} className="animate-spin" />
                    ) : isDragActive ? (
                        <Upload size={40} className="animate-bounce" />
                    ) : (
                        <ImageIcon size={40} />
                    )}
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                    {isProcessing ? 'Preparing your photo...' : isDragActive ? 'Drop it like it\'s hot!' : 'Upload your photo'}
                </h3>

                <p className="text-gray-400 text-lg mb-8 max-w-xs">
                    <span className="sm:hidden">Tap to take a photo or pick one from your library</span>
                    <span className="hidden sm:inline">Drag and drop your image here, or click to browse files</span>
                </p>

                <div className={`
          px-6 py-3 rounded-xl font-semibold text-sm transition-all
          ${isDragActive
                        ? 'bg-white text-accent-pink shadow-lg'
                        : 'bg-white/10 text-white group-hover:bg-accent-pink-light group-hover:shadow-[0_0_20px_rgb(var(--pink-rgb)/0.4)]'
                    }
        `}>
                    Select File
                </div>
            </div>
        </div>
    )
}
