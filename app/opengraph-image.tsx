import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

export const alt = 'Diceify - Free Dice Art Generator featuring dice mosaic portraits'
export const size = {
  width: 1200,
  height: 630,
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
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Background Image */}
        <img
          src={base64Image}
          alt="Diceify dice art"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Logo container with darkened background */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '24px',
            padding: '30px 40px',
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