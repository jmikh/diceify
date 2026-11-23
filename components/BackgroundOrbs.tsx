/** Fixed decorative background shared by every page: gradient orbs (or, `solid`, the flat --bg-editor) + the faint grid (styles/base.css). */
export default function BackgroundOrbs({ solid = false }: { solid?: boolean }) {
  return (
    <>
      {solid ? (
        <div className="bg-gradient solid"></div>
      ) : (
        <div className="bg-gradient">
          <div className="orb one"></div>
          <div className="orb two"></div>
          <div className="orb three"></div>
        </div>
      )}
      <div className="grid-overlay"></div>
    </>
  )
}
