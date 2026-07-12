import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { devLog, devError } from '@/lib/utils/debug'

// The only columns a client may write. Everything else (id, userId,
// percentComplete, timestamps) is server-controlled.
const UPDATABLE_FIELDS = [
  'name',
  'originalImage',
  'numRows', 'colorMode', 'contrast', 'gamma', 'edgeSharpening',
  'rotate2', 'rotate3', 'rotate6',
  'gridWidth', 'gridHeight', 'totalDice',
  'currentX', 'currentY', 'completedDice',
  'cropX', 'cropY', 'cropWidth', 'cropHeight', 'cropRotation',
] as const

async function getOwnedProject(id: string, userId: string) {
  return prisma.project.findFirst({ where: { id, userId } })
}

// GET /api/projects/[id] - Get single project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const project = await getOwnedProject(params.id, session.user.id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    devError('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

// Shared by PATCH (normal saves) and POST (navigator.sendBeacon on page unload)
async function updateProject(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data: Record<string, unknown> = {}
    for (const field of UPDATABLE_FIELDS) {
      if (field in body) data[field] = body[field]
    }
    devLog(`[DB] Updating project ${params.id}, fields: ${Object.keys(data).join(', ')}`)

    const existingProject = await getOwnedProject(params.id, session.user.id)

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // percentComplete is derived, never client-supplied
    const totalDice = (data.totalDice as number) ?? existingProject.totalDice
    const completedDice = (data.completedDice as number) ?? existingProject.completedDice
    data.percentComplete = totalDice > 0
      ? Math.min(100, (completedDice / totalDice) * 100)
      : 0

    const project = await prisma.project.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json(project)
  } catch (error) {
    devError('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

// PATCH /api/projects/[id] - Update project (auto-save, rename, etc.)
export const PATCH = updateProject

// POST /api/projects/[id] - Same update, for navigator.sendBeacon (beacons can't PATCH)
export const POST = updateProject

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const project = await getOwnedProject(params.id, session.user.id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await prisma.project.delete({ where: { id: params.id } })

    devLog(`[DB] Deleted project ${params.id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    devError('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
