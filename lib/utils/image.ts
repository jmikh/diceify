export interface CropRect {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

// Re-derive the cropped image from the original + crop params.
// The cropper reports coordinates in the ROTATED image's coordinate space,
// so when a rotation was applied we rotate the source into its bounding box
// first and crop from that.
export function cropImage(src: string, params: CropRect): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const rotation = (((params.rotation ?? 0) % 360) + 360) % 360

        let source: HTMLImageElement | HTMLCanvasElement = img
        if (rotation !== 0) {
          const rad = (rotation * Math.PI) / 180
          const w = img.naturalWidth
          const h = img.naturalHeight
          const rotated = document.createElement('canvas')
          rotated.width = Math.round(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)))
          rotated.height = Math.round(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad)))
          const rctx = rotated.getContext('2d')
          if (!rctx) throw new Error('Could not get canvas context')
          rctx.translate(rotated.width / 2, rotated.height / 2)
          rctx.rotate(rad)
          rctx.drawImage(img, -w / 2, -h / 2)
          source = rotated
        }

        const canvas = document.createElement('canvas')
        canvas.width = params.width
        canvas.height = params.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')
        ctx.drawImage(
          source,
          params.x, params.y, params.width, params.height,
          0, 0, params.width, params.height
        )
        resolve(canvas.toDataURL('image/jpeg', 0.95))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image for cropping'))
    img.src = src
  })
}
