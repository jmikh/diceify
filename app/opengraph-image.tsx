import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Diceify - Free Dice Art Generator'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#000000',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Background Layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {/* Left Dali */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src="https://diceify.art/images/dali-51x51.png"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'left',
                opacity: 1,
              }}
            />
          </div>

          {/* Center White BG Area */}
          <div
            style={{
              display: 'flex',
              width: '400px', // Fixed width for center
              height: '100%',
              position: 'relative',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/images/background-pattern.png`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 1,
              }}
            />
          </div>

          {/* Right Dali Flipped */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src="https://diceify.art/images/dali-51x51.png"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'right',
                opacity: 1,
                transform: 'scaleX(-1)', // Flip
              }}
            />
          </div>
        </div>

        {/* Logo - icon + text */}
        {/* Logo - icon + text */}
        {/* Pink Dice Icon */}
        <svg
          width="300"
          height="300"
          viewBox="0 0 32 32"
          style={{
            zIndex: 1,
          }}
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
      </div>
    ),
    {
      ...size,
    }
  )
}