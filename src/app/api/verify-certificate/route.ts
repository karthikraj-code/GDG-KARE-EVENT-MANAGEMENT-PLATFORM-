import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { decryptCertificatePayload } from '@/lib/certificateCrypto'

export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const token = url.searchParams.get('token')
        const code = url.searchParams.get('id') || url.searchParams.get('code')

        // 1. PRIMARY TAMPER-PROOF AUTHENTICATION: Encrypted QR Token
        if (token) {
            const payload = decryptCertificatePayload(token)

            if (!payload) {
                return NextResponse.json({
                    success: false,
                    verified: false,
                    isTampered: true,
                    error: 'Tampered or counterfeit credential. The cryptographic signature on this QR code is invalid or has been modified.'
                }, { status: 400 })
            }

            const isNotEligible = payload.category === 'Not Eligible'

            return NextResponse.json({
                success: true,
                verified: true,
                isEncryptedToken: true,
                certificate: {
                    certificate_code: payload.id,
                    name: payload.name,
                    reg_no: payload.reg_no,
                    dept: payload.dept || 'Engineering',
                    section: payload.section || '—',
                    year: payload.year || '—',
                    category: payload.category || 'Group 3',
                    team_name: payload.team_name || '',
                    is_not_eligible: isNotEligible,
                    certificate_type: payload.type || 'Participation',
                    issue_date: payload.issue_date || (payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString()),
                    verified_at: new Date().toISOString()
                }
            })
        }

        // 2. SECONDARY AUTHENTICATION: Database Certificate Code Lookup (Manual Search Bar)
        if (code) {
            const cleanCode = code.trim()
            const supabase = await createAdminClient()

            const { data: cert, error } = await supabase
                .from('certificates')
                .select('*')
                .ilike('certificate_code', cleanCode)
                .maybeSingle()

            if (error && error.code !== 'PGRST205' && !error.message?.includes('does not exist')) {
                console.error('Error querying certificate:', error)
                return NextResponse.json({ error: 'Database lookup error' }, { status: 500 })
            }

            if (cert) {
                const isNotEligible = cert.category === 'Not Eligible' || cert.eligible === false
                return NextResponse.json({
                    success: true,
                    verified: true,
                    isDatabaseRecord: true,
                    certificate: {
                        certificate_code: cert.certificate_code,
                        name: cert.name,
                        reg_no: cert.reg_no,
                        dept: cert.dept || 'General Track',
                        section: cert.section || '—',
                        year: cert.year || '—',
                        category: cert.category || 'Group 3',
                        team_name: cert.team_name || '',
                        is_not_eligible: isNotEligible,
                        certificate_type: cert.template_name || (cert.metadata && cert.metadata.cert_type) || 'Participation',
                        issue_date: cert.issue_date || cert.created_at,
                        verified_at: new Date().toISOString()
                    }
                })
            }

            return NextResponse.json({
                success: false,
                verified: false,
                error: `Certificate ID "${cleanCode}" was not found in the official registry. Please ensure the code is correct, or scan the official encrypted QR code directly on the certificate.`
            }, { status: 404 })
        }

        return NextResponse.json({
            success: false,
            verified: false,
            error: 'No certificate token or ID provided for authentication.'
        }, { status: 400 })

    } catch (err: any) {
        console.error('Verify certificate error:', err)
        return NextResponse.json({ error: 'Internal verification server error' }, { status: 500 })
    }
}
