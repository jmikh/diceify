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

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <img
          src={base64Image}
          alt="Diceify dice art"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}