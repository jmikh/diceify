import '@/styles/marketing.css'
import BackgroundOrbs from '@/components/BackgroundOrbs'

// /share (the shell the Worker serves at /s/<id>, see worker/share.ts): the marketing styles and background, but
// no navbar or footer. ShareView has its own header, and the page is a card for the shared piece, not a site page.
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundOrbs />
      {children}
    </>
  )
}
