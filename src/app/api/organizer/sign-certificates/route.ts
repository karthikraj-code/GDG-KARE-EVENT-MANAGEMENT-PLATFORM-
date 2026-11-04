import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from 'next/server'
import { encryptCertificatePayload, CertificatePayload } from '@/lib/certificateCrypto'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user || user.role !== 'organizer') {
            return NextResponse.json({ error: 'Unauthorized: Organizer credentials required' }, { status: 401 })
        }

        const body = await request.json()
        const certificates: CertificatePayload[] = body.certificates

        if (!certificates || !Array.isArray(certificates)) {
            return NextResponse.json({ error: 'Invalid payload: certificates array required' }, { status: 400 })
        }

        // Fast batch encryption
        const tokens: string[] = certificates.map(cert => encryptCertificatePayload(cert))

        return NextResponse.json({
            success: true,
            tokens
        })
    } catch (err: any) {
        console.error('Sign certificates error:', err)
        return NextResponse.json({ error: err.message || 'Failed to sign certificates' }, { status: 500 })
    }
}

