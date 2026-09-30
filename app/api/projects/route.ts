import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/api/legacy-auth' // TODO(C3): route deleted with the Prisma backend
import { prisma } from '@/lib/prisma'
import { devLog, devError } from '@/lib/utils/debug'

// GET /api/projects - Get all projects for current user
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  devLog(`[DB] GET /api/projects - Fetching all projects for user ${session.user.id}`)
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        name: true,

        percentComplete: true,
        totalDice: true,
        completedDice: true,
        currentX: true,
        currentY: true,
        updatedAt: true,
        createdAt: true
        // Excluded large fields: originalImage, croppedImage, gridData
        // These will be fetched only when loading a specific project
      }
    })

    devLog(`[DB] Found ${projects.length} projects for user`)
    return NextResponse.json(projects)
  } catch (error) {
    devError('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  devLog(`[DB] POST /api/projects - Creating new project for user ${session.user.id}`)
  try {
    // TODO(C3): the plan's project limit is enforced by the `projects_enforce_limit` trigger on Supabase; the
    // Prisma-side check went with the NextAuth helpers (this route only answers 401 now, see lib/api/legacy-auth.ts).
    const body = await request.json()
    const {
      name = 'Untitled Project',

      originalImage,
      croppedImage, // This will be stored as originalImage if no originalImage provided
      numRows,
      colorMode,
      contrast,
      gamma,
      edgeSharpening,
      rotate2,
      rotate3,
      rotate6,
      totalDice,
      completedDice,
      currentX,
      currentY,
      percentComplete,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      cropRotation
    } = body

    devLog(`[DB] Creating new project with name: ${name}`)
    devLog(`[DB] Has originalImage: ${!!originalImage}, Has croppedImage: ${!!croppedImage}`)

    // Use croppedImage as originalImage if originalImage is not provided
    // This happens when user crops before saving
    const imageToSave = originalImage || croppedImage

    const project = await prisma.project.create({
      data: {
        name,
        userId: session.user.id,

        originalImage: imageToSave,
        numRows,
        colorMode,
        contrast,
        gamma,
        edgeSharpening,
        rotate2,
        rotate3,
        rotate6,
        totalDice,
        completedDice,
        currentX,
        currentY,
        percentComplete,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        cropRotation
      }
    })

    devLog(`[DB] Created project ${project.id}`)
    return NextResponse.json(project)
  } catch (error) {
    devError('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}