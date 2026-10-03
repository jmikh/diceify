import '@/styles/marketing.css'
import BackgroundOrbs from '@/components/BackgroundOrbs'
import Footer from '@/components/Footer'
import Navbar from '@/features/marketing/components/Navbar'

// Landing, blog, gallery, dice-art and legal pages. The navbar and footer render here, once, for every
// marketing page. The navbar is fixed, so each page clears it with its own top padding.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundOrbs />
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
