import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ensureDbUser } from '@/lib/ensureUser'
import { getMailProviderConfig } from '@/lib/mail/mailer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const dbUser = await ensureDbUser(user)
        const isOrganizer = user.role === 'organizer' || dbUser?.role === 'organizer'

        if (!isOrganizer) {
            return NextResponse.json({ error: 'Forbidden: Organizer access required' }, { status: 403 })
        }

        const config = getMailProviderConfig()

        return NextResponse.json({
            success: true,
            provider: config.provider,
            isConfigured: config.isConfigured,
            fromAddress: config.fromAddress,
            details: config.details
        })
    } catch (error: any) {
        console.error('Error fetching mail config:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

