import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Diceify - Free Dice Art Generator featuring dice mosaic portraits of famous figures'
export const size = {
  width: 1200,
  height: 600,
}
export const contentType = 'image/png'

// Gallery images to feature in the Twitter collage (using 6 for 3x2 grid)
const galleryImages = [
  { src: 'https://diceify.art/images/dali-51x51.png', alt: 'Salvador Dali' },
  { src: 'https://diceify.art/images/frida-54x54.png', alt: 'Frida Kahlo' },
  { src: 'https://diceify.art/images/monalisa.jpg', alt: 'Mona Lisa' },
  { src: 'https://diceify.art/images/salah-61x61.png', alt: 'Mo Salah' },
  { src: 'https://diceify.art/images/kobe-71x71.png', alt: 'Kobe Bryant' },
  { src: 'https://diceify.art/images/sharbatgula-52x52.png', alt: 'Afghan Girl' },
]

export default async function Image() {
  // Fetch Syne Bold font from Google Fonts
  const syneBoldData = await fetch(
    'https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap'
  )
    .then((res) => res.text())
    .then((css) => {
      // Extract the font URL from the CSS
      const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1]
      if (!fontUrl) throw new Error('Could not find font URL')
      return fetch(fontUrl)
    })
    .then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* 3x2 Grid of Gallery Images */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {galleryImages.map((img, i) => (
            <div
              key={i}
              style={{
                width: '400px', // 1200 / 3 = 400
                height: '300px', // 600 / 2 = 300
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src={img.src}
                alt={img.alt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>

        {/* Center Logo Overlay with backdrop */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '24px',
            padding: '30px 50px',
            zIndex: 10,
          }}
        >
          {/* Pink Dice Icon */}
          <svg
            width="120"
            height="120"
            viewBox="0 0 32 32"
          >
            <rect fill="#FF2D92" x="0" y="0" width="32" height="32" rx="6" ry="6" />
            <rect
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              x="3"
              y="3"
              width="26"
              height="26"
              rx="3.5"
              ry="3.5"
            />
            <circle fill="#fff" cx="10" cy="10" r="3.5" />
            <circle fill="#fff" cx="22" cy="22" r="3.5" />
          </svg>

          {/* Brand Text */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '16px',
            }}
          >
            <span
              style={{
                display: 'flex',
                fontSize: '48px',
                fontWeight: 700,
                letterSpacing: '-1px',
                fontFamily: 'Syne, sans-serif',
              }}
            >
              <span style={{ color: '#ffffff' }}>Dice</span>
              <span style={{ color: '#FF2D92' }}>ify</span>
            </span>
            <span
              style={{
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginTop: '4px',
              }}
            >
              Free Dice Art Generator
            </span>
          </div>
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