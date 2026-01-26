import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

export const alt = 'Diceify - Free Dice Art Generator featuring dice mosaic portraits'
export const size = {
  width: 1200,
  height: 600,
}
export const contentType = 'image/png'

export default async function Image() {
  // Read the static OG image from public folder
  const imageData = await readFile(join(process.cwd(), 'public/images/og-image.png'))
  const base64Image = `data:image/png;base64,${imageData.toString('base64')}`

  // Fetch Syne Bold font from Google Fonts
  const syneBoldData = await fetch(
    'https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap'
  )
    .then((res) => res.text())
    .then((css) => {
      const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1]
      if (!fontUrl) throw new Error('Could not find font URL')
      return fetch(fontUrl)
    })
    .then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Image - scaled to cover 1200x600 container */}
        {/* Original: 1024x574, scaled to width 1200 = 1200x672, centered vertically */}
        <img
          src={base64Image}
          width={1200}
          height={672}
          style={{
            position: 'absolute',
            top: '-36px',
            left: '0',
          }}
        />

        {/* Logo container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {/* Diceify Logo Text */}
          <span
            style={{
              display: 'flex',
              fontSize: '120px',
              fontWeight: 700,
              letterSpacing: '-2px',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            <span style={{ color: '#ffffff' }}>Dice</span>
            <span style={{ color: '#FF2D92' }}>ify</span>
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Syne',
          data: syneBoldData,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}