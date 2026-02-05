import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                commissionInterest: true,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[COMMISSION_INTEREST_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
