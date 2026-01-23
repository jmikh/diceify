'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { X } from 'lucide-react'
import { devLog } from '@/lib/utils/debug'
import { sendGAEvent } from '@next/third-parties/google'
import Image from 'next/image'
import Logo from '@/components/Logo'
import { useEditorStore } from '@/lib/store/useEditorStore'

interface AuthModalProps {
  isOpen: boolean
  onClose?: () => void
  onSuccess?: () => void
  message?: string
}

export default function AuthModal({
  isOpen, onClose, onSuccess, message }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<React.ReactNode | null>(null)
  const [showOtherMethods, setShowOtherMethods] = useState(false)
  const [disabledProviders, setDisabledProviders] = useState<string[]>([])

  if (!isOpen) return null

  const handleProviderSignIn = async (provider: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // OAuth providers require redirect, so save state to sessionStorage first
      // The editor will restore this state after redirect
      // Get latest state directly from Zustand instead of stale props
      const state = useEditorStore.getState()
      const editorState = {
        originalImage: state.originalImage,
        croppedImage: state.croppedImage,
        processedImageUrl: state.processedImageUrl,
        cropParams: state.cropParams,
        diceParams: state.diceParams,
        step: state.step,
      }
      if (editorState.originalImage || editorState.cropParams) {
        devLog('[DEBUG] Saving editor state before OAuth redirect')
        sessionStorage.setItem('editorStateBeforeAuth', JSON.stringify(editorState))
      }

      // For OAuth providers, we must redirect to the provider's auth page
      await signIn(provider, {
        callbackUrl: '/editor?restored=true'  // Add flag to indicate state should be restored
      })
      // The page will redirect, so this code won't execute
    } catch (err) {
      setError('An unexpected error occurred.')
      setIsLoading(false)
    }
  }

  const handleUnsupportedProvider = (providerName: string) => {
    sendGAEvent('event', 'unsupported_login_provider_click', { provider: providerName })
    setError(
      <>
        Sorry, we are working on supporting {providerName} login.
      </>
    )
    setDisabledProviders(prev => [...prev, providerName])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="glass relative w-full max-w-md p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[var(--pink-glow)] rounded-full blur-[80px] pointer-events-none opacity-50" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none opacity-50" />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
            disabled={isLoading}
          >
            <X size={20} className="text-white/60 hover:text-white transition-colors" />
          </button>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <Image
              src="/icon.svg"
              alt="Diceify Icon"
              fill
              className="object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]"
            />
          </div>

          <div className="scale-125 mb-6 origin-center">
            <Logo />
          </div>

          <p className="text-[var(--text-muted)] text-sm max-w-[80%]">
            {message || 'Sign in to save your artwork and unlock sharing features.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Sign in buttons */}
        <div className="w-full space-y-3 relative z-10">
          <button
            onClick={() => handleProviderSignIn('google')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl border border-[var(--border-glass)] bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-white/90 font-medium">Continue with Google</span>
          </button>

          {!showOtherMethods ? (
            <button
              onClick={() => setShowOtherMethods(true)}
              className="w-full py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              Sign in using other methods
            </button>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Apple */}
              <button
                onClick={() => handleUnsupportedProvider('Apple')}
                disabled={isLoading || disabledProviders.includes('Apple')}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl border border-[var(--border-glass)] bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-5 h-5 text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.99 4.31-.66C18.03 7.53 19.5 8.35 20 9.07c-3.17 1.86-2.57 6.32.95 7.72-.51 1.55-1.28 2.69-1.9 3.49zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span className="text-white/90 font-medium">Sign in with Apple</span>
              </button>

              {/* Facebook */}
              <button
                onClick={() => handleUnsupportedProvider('Facebook')}
                disabled={isLoading || disabledProviders.includes('Facebook')}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl border border-[var(--border-glass)] bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-5 h-5 text-[#1877F2] group-hover:drop-shadow-[0_0_8px_rgba(24,119,242,0.3)] transition-all" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="text-white/90 font-medium">Sign in with Facebook</span>
              </button>
            </div>
          )}
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-white/30 mt-6 max-w-[80%]">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}