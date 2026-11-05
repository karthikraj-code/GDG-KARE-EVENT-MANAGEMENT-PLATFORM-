import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDbUser } from '@/lib/ensureUser'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createAdminClient()
        const dbUser = await ensureDbUser(user)
        const isOrganizer = user.role === 'organizer' || dbUser?.role === 'organizer'

        if (!isOrganizer) {
            return NextResponse.json({ error: 'Forbidden: Organizer access required' }, { status: 403 })
        }

        const url = new URL(request.url)
        const baseUrl = url.origin

        // 1. Fetch participants from users table
        let participants: any[] = []
        try {
            const { data: usersData, error: usersErr } = await supabase
                .from('users')
                .select('id, name, email, reg_no, dept, section, year, category')
                .eq('role', 'participant')
                .order('name', { ascending: true })

            if (!usersErr && usersData) {
                participants = usersData
            }
        } catch (e) {
            console.warn('Could not fetch participants from users table:', e)
        }

        // 2. Fetch team memberships
        const teamMap = new Map<string, string>()
        try {
            const { data: memberships } = await supabase
                .from('team_members')
                .select(`
                    user_id,
                    teams (
                        id,
                        name
                    )
                `)
            
            if (memberships) {
                for (const m of memberships as any[]) {
                    if (m.user_id && m.teams?.name) {
                        teamMap.set(m.user_id, m.teams.name)
                    }
                }
            }
        } catch (e) {
            console.warn('Could not fetch team memberships:', e)
        }

        // 3. Fetch issued certificates
        const certMap = new Map<string, any>()
        try {
            const { data: certs } = await supabase
                .from('certificates')
                .select('*')
                .order('created_at', { ascending: false })

            if (certs) {
                for (const c of certs) {
                    // Index by reg_no (lowercased) and user_id
                    if (c.reg_no) {
                        certMap.set(c.reg_no.trim().toLowerCase(), c)
                    }
                    if (c.user_id) {
                        certMap.set(c.user_id, c)
                    }
                }
            }
        } catch (e) {
            console.warn('Certificates table check failed or not created yet:', e)
        }

        // 4. Fetch past mail logs to check if certificate email already sent
        const alreadySentCerts = new Set<string>()
        try {
            const { data: logs } = await supabase
                .from('mail_logs')
                .select('certificate_code, recipient_reg_no, status')
                .eq('type', 'certificate')
                .in('status', ['sent', 'delivered'])

            if (logs) {
                for (const l of logs) {
                    if (l.certificate_code) alreadySentCerts.add(l.certificate_code)
                    if (l.recipient_reg_no) alreadySentCerts.add(l.recipient_reg_no.trim().toLowerCase())
                }
            }
        } catch (e) {
            // mail_logs might not exist yet
        }

        // Combine into unified recipient list
        const results = participants.map(p => {
            const teamName = teamMap.get(p.id) || null
            const regKey = (p.reg_no || '').trim().toLowerCase()
            const cert = certMap.get(regKey) || (p.id ? certMap.get(p.id) : null)

            const certificateCode = cert?.certificate_code || null
            const awardTier = cert?.award_tier || cert?.template_name || 'Participation'
            const isCertSent = certificateCode ? alreadySentCerts.has(certificateCode) : (p.reg_no ? alreadySentCerts.has(regKey) : false)

            return {
                id: p.id,
                name: p.name || 'Participant',
                email: p.email || '',
                reg_no: p.reg_no || '',
                dept: p.dept || '',
                section: p.section || '',
                year: p.year || '',
                category: p.category || cert?.category || '',
                team_name: teamName || cert?.team_name || 'Individual Track',
                has_certificate: !!cert,
                certificate_code: certificateCode,
                certificate_url: certificateCode ? `${baseUrl}/verify-certificate?id=${encodeURIComponent(certificateCode)}` : null,
                award_tier: awardTier,
                is_cert_sent: isCertSent
            }
        })

        // Also include certificates that might have been issued directly (e.g. from Excel imports or without user accounts)
        const knownRegs = new Set(results.map(r => (r.reg_no || '').trim().toLowerCase()))
        for (const [key, cert] of Array.from(certMap.entries())) {
            const certReg = (cert.reg_no || '').trim().toLowerCase()
            if (certReg && !knownRegs.has(certReg)) {
                knownRegs.add(certReg)
                const isCertSent = cert.certificate_code ? alreadySentCerts.has(cert.certificate_code) : alreadySentCerts.has(certReg)
                results.push({
                    id: cert.user_id || `cert_${cert.id || Math.random()}`,
                    name: cert.name || 'Participant',
                    email: cert.metadata?.email || '',
                    reg_no: cert.reg_no || '',
                    dept: cert.dept || '',
                    section: cert.section || '',
                    year: cert.year || '',
                    category: cert.category || '',
                    team_name: cert.team_name || 'Individual Track',
                    has_certificate: true,
                    certificate_code: cert.certificate_code,
                    certificate_url: cert.certificate_code ? `${baseUrl}/verify-certificate?id=${encodeURIComponent(cert.certificate_code)}` : null,
                    award_tier: cert.award_tier || cert.template_name || 'Participation',
                    is_cert_sent: isCertSent
                })
            }
        }

        return NextResponse.json({
            success: true,
            participants: results,
            total: results.length
        })
    } catch (error: any) {
        console.error('Error fetching participants for mail:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

