/** Fixed decorative background shared by every page: gradient orbs + the faint grid (styles/base.css). */
export default function BackgroundOrbs() {
  return (
    <>
      <div className="bg-gradient">
        <div className="orb one"></div>
        <div className="orb two"></div>
        <div className="orb three"></div>
      </div>
      <div className="grid-overlay"></div>
    </>
  )
}
