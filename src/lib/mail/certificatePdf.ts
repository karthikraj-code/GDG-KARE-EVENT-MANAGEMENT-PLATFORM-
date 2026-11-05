import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { MailRecipient, MailAttachment } from './types'

export interface GenerateCertificatePdfOptions {
    recipient: MailRecipient
    eventName?: string
    eventDate?: string
    organizerName?: string
    certificateUrl?: string
}

/**
 * Generates an official, print-ready landscape PDF certificate with embedded verification QR code.
 */
export async function generateCertificatePdf(options: GenerateCertificatePdfOptions): Promise<MailAttachment> {
    const { recipient, eventName = 'GDG-KARE Hackathon', eventDate = 'November 2026', organizerName = 'GDG-KARE Lead & Organizing Committee' } = options
    const certCode = recipient.certificate_code || recipient.reg_no || 'CERT'
    const certUrl = options.certificateUrl || recipient.certificate_url || `https://hackare.vercel.app/verify-certificate?id=${encodeURIComponent(certCode)}`
    const awardTier = recipient.award_tier || 'Participation'
    const name = recipient.name || 'Participant'
    const regNo = recipient.reg_no || '—'
    const teamName = recipient.team_name || 'Individual Track'

    // Create A4 Landscape document (841.89 x 595.28 pt)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    })

    const pageWidth = 841.89
    const pageHeight = 595.28

    // 1. Background fill
    doc.setFillColor(253, 253, 254)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    // 2. Elegant border frames
    // Outer dark frame
    doc.setDrawColor(15, 23, 42) // slate-900
    doc.setLineWidth(5)
    doc.rect(24, 24, pageWidth - 48, pageHeight - 48, 'S')

    // Inner gold/accent frame
    doc.setDrawColor(217, 119, 6) // amber-600
    doc.setLineWidth(1.5)
    doc.rect(32, 32, pageWidth - 64, pageHeight - 64, 'S')

    // Corner decorative accents
    doc.setFillColor(37, 99, 235) // blue-600
    doc.rect(22, 22, 14, 14, 'F')
    doc.rect(pageWidth - 36, 22, 14, 14, 'F')
    doc.rect(22, pageHeight - 36, 14, 14, 'F')
    doc.rect(pageWidth - 36, pageHeight - 36, 14, 14, 'F')

    // 3. Institution / Community Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(37, 99, 235) // primary blue
    doc.text('GOOGLE DEVELOPER GROUPS ON CAMPUS', pageWidth / 2, 70, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(100, 116, 139)
    doc.text('KALASALINGAM ACADEMY OF RESEARCH AND EDUCATION', pageWidth / 2, 85, { align: 'center' })

    // 4. Main Certificate Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(15, 23, 42) // slate-900
    const titleText = awardTier.toLowerCase().includes('winner')
        ? 'CERTIFICATE OF EXCELLENCE'
        : awardTier.toLowerCase().includes('mention')
        ? 'CERTIFICATE OF SPECIAL MENTION'
        : 'CERTIFICATE OF PARTICIPATION'
    doc.text(titleText, pageWidth / 2, 126, { align: 'center' })

    // Ribbon / Tier line
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(180, 83, 9) // amber-700
    doc.text(`★  ${awardTier.toUpperCase()}  ★`, pageWidth / 2, 148, { align: 'center' })

    // Decorative divider line
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(1)
    doc.line(pageWidth / 2 - 160, 162, pageWidth / 2 + 160, 162)

    // 5. Presentation line
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(12)
    doc.setTextColor(71, 85, 105)
    doc.text('This certificate is proudly awarded to', pageWidth / 2, 192, { align: 'center' })

    // 6. Recipient Name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.setTextColor(15, 23, 42)
    doc.text(name, pageWidth / 2, 234, { align: 'center' })

    // 7. Details row (Reg No & Team)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(71, 85, 105)
    const detailsStr = regNo !== '—'
        ? `Registration No: ${regNo}   •   Team: ${teamName}`
        : `Team: ${teamName}`
    doc.text(detailsStr, pageWidth / 2, 260, { align: 'center' })

    // 8. Event Recognition Paragraph
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11.5)
    doc.setTextColor(51, 65, 85)
    const descText = `In recognition of valuable participation and demonstrated technical proficiency in`
    doc.text(descText, pageWidth / 2, 298, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(30, 58, 138) // dark blue
    doc.text(eventName, pageWidth / 2, 322, { align: 'center' })

    // 9. QR Code generation & placement
    try {
        const qrDataUrl = await QRCode.toDataURL(certUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 140,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        })
        // Draw QR code near bottom center (x: 376, y: 390, size: 90)
        const qrSize = 88
        const qrX = pageWidth / 2 - (qrSize / 2)
        const qrY = 380
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text('SCAN TO VERIFY AUTHENTICITY', pageWidth / 2, qrY + qrSize + 14, { align: 'center' })
    } catch (e) {
        console.warn('QR code generation failed for certificate PDF:', e)
    }

    // 10. Left Footer: Verification ID & Date
    const footerY = 485
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('Credential Identification:', 55, footerY - 24)

    doc.setFont('courier', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(certCode, 55, footerY - 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Date of Issue: ${eventDate}`, 55, footerY + 8)

    // 11. Right Footer: Signature & Organizer
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(1)
    doc.line(pageWidth - 250, footerY - 14, pageWidth - 55, footerY - 14)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text(organizerName, pageWidth - 152.5, footerY + 2, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Authorized Signatory • GDG Community', pageWidth - 152.5, footerY + 16, { align: 'center' })

    // Generate Base64
    const arrayBuffer = doc.output('arraybuffer')
    const base64Content = Buffer.from(arrayBuffer).toString('base64')

    // Clean filename named directly by registration number
    const cleanReg = (recipient.reg_no || '').replace(/[^a-zA-Z0-9_-]/g, '')
    const cleanCode = (certCode || '').replace(/[^a-zA-Z0-9_-]/g, '')
    const filename = cleanReg
        ? `${cleanReg}.pdf`
        : `Certificate_${cleanCode || 'Official'}.pdf`

    return {
        filename,
        content: base64Content,
        contentType: 'application/pdf'
    }
}

