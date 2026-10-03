import EditorScreen from '@/features/editor/components/shell/EditorScreen'

// The workspace renders client-side (its static HTML is the loading screen), so this screen-reader-only intro is
// the page's heading and the only text crawlers that don't run JavaScript get.
// The bootstrap reads window.location.search directly (no useSearchParams), so no Suspense boundary is needed.
export default function EditorPage() {
  return (
    <>
      <div className="sr-only">
        <h1>Diceify dice art editor</h1>
        <p>
          Turn a photo into dice art in three steps: crop it, tune the contrast and detail, then build it die by die
          with a row-by-row guide. The editor shows the grid size and the exact number of black and white dice you
          need. Free to start, no account needed.
        </p>
      </div>
      <EditorScreen />
    </>
  )
}
