import '@/styles/marketing.css'
import BackgroundOrbs from '@/components/BackgroundOrbs'

// Landing, blog, gallery, dice-art and legal pages. Only the landing page has a navbar and footer
// (the others link back), so those stay in (marketing)/page.tsx.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundOrbs />
      {children}
    </>
  )
}
