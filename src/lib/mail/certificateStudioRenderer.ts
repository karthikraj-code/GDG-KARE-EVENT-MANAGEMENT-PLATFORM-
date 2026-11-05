import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { MailRecipient, MailAttachment } from './types'

// Match Certificate Studio's IndexedDB schema
const CERT_DB_NAME = 'hackare_cert_db'
const CERT_DB_VERSION = 1
const CERT_STORE_NAME = 'templates'

export interface StudioTemplateAsset {
    tier: string
    imageDataUrl: string
    fileName: string
    dimensions: { width: number; height: number }
    layout: any
}

// In-memory cache of loaded template images
const cachedTemplateAssets: Record<string, StudioTemplateAsset> = {}
const cachedImages: Record<string, HTMLImageElement> = {}

/**
 * Opens IndexedDB used by Certificate Studio
 */
function openCertDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not supported'))
            return
        }
        const req = indexedDB.open(CERT_DB_NAME, CERT_DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(CERT_STORE_NAME)) {
                db.createObjectStore(CERT_STORE_NAME, { keyPath: 'tier' })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

/**
 * Loads all templates saved in Certificate Studio (IndexedDB + Supabase Cloud)
 */
export async function loadCertificateStudioTemplates(): Promise<Record<string, StudioTemplateAsset>> {
    const templates: Record<string, StudioTemplateAsset> = {}

    // 1. Load from IndexedDB
    try {
        const db = await openCertDb()
        await new Promise<void>((resolve) => {
            const tx = db.transaction(CERT_STORE_NAME, 'readonly')
            const store = tx.objectStore(CERT_STORE_NAME)
            const req = store.getAll()
            req.onsuccess = () => {
                if (Array.isArray(req.result)) {
                    req.result.forEach((item: any) => {
                        if (item.tier) {
                            templates[item.tier.toLowerCase()] = item
                            cachedTemplateAssets[item.tier.toLowerCase()] = item
                        }
                    })
                }
                resolve()
            }
            req.onerror = () => resolve()
        })
    } catch (e) {
        // Fallback to cloud API
    }

    // 2. Fetch from Supabase Cloud API in background if needed
    try {
        const res = await fetch('/api/organizer/certificate-templates')
        const data = await res.json()
        if (data.success && Array.isArray(data.templates)) {
            data.templates.forEach((item: any) => {
                if (item.tier && !templates[item.tier.toLowerCase()]) {
                    const formatted: StudioTemplateAsset = {
                        tier: item.tier,
                        imageDataUrl: item.image_url || item.imageDataUrl,
                        fileName: item.file_name || 'template.png',
                        dimensions: item.dimensions || { width: 1920, height: 1080 },
                        layout: item.layout
                    }
                    templates[item.tier.toLowerCase()] = formatted
                    cachedTemplateAssets[item.tier.toLowerCase()] = formatted
                }
            })
        }
    } catch (e) {
        // Safe to proceed with IndexedDB templates
    }

    return templates
}

/**
 * Loads an HTMLImageElement for a data URL or image URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    if (cachedImages[src]) return Promise.resolve(cachedImages[src])
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            cachedImages[src] = img
            resolve(img)
        }
        img.onerror = (e) => reject(e)
        img.src = src
    })
}

/**
 * Maps an award tier string to the closest Certificate Studio template tier ID
 */
export function normalizeTierKey(awardTier?: string): string {
    const clean = (awardTier || '').toLowerCase().trim()
    if (clean.includes('winner 1') || clean.includes('1st place') || clean.includes('1st')) return 'winner_1'
    if (clean.includes('winner 2') || clean.includes('2nd place') || clean.includes('2nd')) return 'winner_2'
    if (clean.includes('winner 3') || clean.includes('3rd place') || clean.includes('3rd')) return 'winner_3'
    if (clean.includes('winner')) return 'winner'
    if (clean.includes('special') || clean.includes('mention')) return 'special_mention'
    return 'participation'
}

/**
 * Renders the exact Certificate Studio design on an offscreen canvas and returns a MailAttachment.
 * File name is ALWAYS based on the participant's registration number (e.g. 21BCE1092.png or 21BCE1092.pdf).
 */
export async function renderCertificateStudioAttachment(
    recipient: MailRecipient,
    options: {
        format?: 'png' | 'pdf'
        eventName?: string
        templates?: Record<string, StudioTemplateAsset>
    } = {}
): Promise<MailAttachment> {
    const { format = 'png', eventName = 'GDG-KARE Event' } = options
    const templates = options.templates || cachedTemplateAssets

    const tierKey = normalizeTierKey(recipient.award_tier)
    let asset = templates[tierKey] || templates['participation'] || Object.values(templates)[0]

    // If templates weren't preloaded, attempt instant load
    if (!asset) {
        const loaded = await loadCertificateStudioTemplates()
        asset = loaded[tierKey] || loaded['participation'] || Object.values(loaded)[0]
    }

    const certCode = recipient.certificate_code || recipient.reg_no || 'CERT'
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hackare.vercel.app'
    const verifyUrl = recipient.certificate_url || `${baseUrl}/verify-certificate?id=${encodeURIComponent(certCode)}`

    // Clean filename using Registration Number (matching User Requirement #4)
    const rawReg = (recipient.reg_no || '').trim()
    const cleanReg = rawReg
        ? rawReg.replace(/[/\\?%*:|"<>]/g, '_')
        : (recipient.name || 'Participant').trim().replace(/[/\\?%*:|"<>]/g, '_')

    // 1. If we have a custom Certificate Studio template image and layout
    if (asset && asset.imageDataUrl && asset.layout) {
        try {
            const img = await loadImage(asset.imageDataUrl)
            const width = asset.dimensions?.width || img.naturalWidth || 1920
            const height = asset.dimensions?.height || img.naturalHeight || 1080
            const layout = asset.layout

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')

            if (ctx) {
                // Clear & draw background
                ctx.clearRect(0, 0, width, height)
                ctx.drawImage(img, 0, 0, width, height)

                // 2. Participant Name
                if (layout.name && layout.name.enabled !== false) {
                    let nameFontSize = layout.name.fontSize || 72
                    const fontWeight = layout.name.fontWeight || 'bold'
                    const fontFamily = layout.name.fontFamily || 'Georgia, serif'
                    ctx.font = `${fontWeight} ${nameFontSize}px ${fontFamily}`

                    const maxAllowedNameWidth = layout.name.maxWidth || Math.round(width * 0.6)
                    const measuredWidth = ctx.measureText(recipient.name).width
                    if (measuredWidth > maxAllowedNameWidth && maxAllowedNameWidth > 0) {
                        const scale = maxAllowedNameWidth / measuredWidth
                        nameFontSize = Math.max(28, Math.floor(nameFontSize * scale))
                        ctx.font = `${fontWeight} ${nameFontSize}px ${fontFamily}`
                    }

                    ctx.fillStyle = layout.name.color || '#1e293b'
                    ctx.textAlign = layout.name.align || 'center'
                    ctx.fillText(recipient.name, layout.name.x || width / 2, layout.name.y || height * 0.45)
                }

                // 3. Reg No
                if (layout.regNo && layout.regNo.enabled !== false && recipient.reg_no) {
                    ctx.font = `${layout.regNo.fontWeight || 'normal'} ${layout.regNo.fontSize || 28}px ${layout.regNo.fontFamily || 'Arial, sans-serif'}`
                    ctx.fillStyle = layout.regNo.color || '#475569'
                    ctx.textAlign = 'center'
                    const prefix = layout.regNo.prefix || 'Reg No: '
                    ctx.fillText(`${prefix}${recipient.reg_no}`, layout.regNo.x || width / 2, layout.regNo.y || height * 0.52)
                }

                // 4. Academic Credit / Category (e.g. Group 3, EE Credit)
                if (layout.credit && layout.credit.enabled !== false && recipient.category) {
                    ctx.font = `${layout.credit.fontWeight || 'bold'} ${layout.credit.fontSize || 24}px ${layout.credit.fontFamily || 'Arial, sans-serif'}`
                    ctx.fillStyle = layout.credit.color || '#2563eb'
                    ctx.textAlign = layout.credit.align || 'center'
                    ctx.fillText(String(recipient.category), layout.credit.x || width / 2, layout.credit.y || height * 0.58)
                }

                // 5. Unique Certificate ID
                if (layout.certId && layout.certId.enabled !== false) {
                    ctx.font = `${layout.certId.fontWeight || 'normal'} ${layout.certId.fontSize || 20}px ${layout.certId.fontFamily || 'monospace'}`
                    ctx.fillStyle = layout.certId.color || '#64748b'
                    ctx.textAlign = 'center'
                    const prefix = layout.certId.prefix || 'ID: '
                    ctx.fillText(`${prefix}${certCode}`, layout.certId.x || width / 2, layout.certId.y || height * 0.88)
                }

                // 6. Verification QR Code
                if (layout.qrCode && layout.qrCode.enabled !== false) {
                    const qrSize = layout.qrCode.size || 140
                    const qrCanvas = document.createElement('canvas')
                    await QRCode.toCanvas(qrCanvas, verifyUrl, {
                        width: qrSize,
                        margin: 1,
                        color: {
                            dark: layout.qrCode.darkColor || '#000000',
                            light: layout.qrCode.lightColor || '#ffffff'
                        }
                    })
                    ctx.drawImage(qrCanvas, layout.qrCode.x || width * 0.82, layout.qrCode.y || height * 0.78, qrSize, qrSize)
                }

                // Convert to requested attachment format
                if (format === 'pdf') {
                    const canvasDataUrl = canvas.toDataURL('image/jpeg', 0.95)
                    const doc = new jsPDF({
                        orientation: 'landscape',
                        unit: 'px',
                        format: [width, height]
                    })
                    doc.addImage(canvasDataUrl, 'JPEG', 0, 0, width, height)
                    const arrayBuffer = doc.output('arraybuffer')
                    const base64Pdf = Buffer.from(arrayBuffer).toString('base64')

                    return {
                        filename: `${cleanReg}.pdf`,
                        content: base64Pdf,
                        contentType: 'application/pdf'
                    }
                } else {
                    const pngDataUrl = canvas.toDataURL('image/png', 0.95)
                    const base64Png = pngDataUrl.replace(/^data:image\/png;base64,/, '')

                    return {
                        filename: `${cleanReg}.png`,
                        content: base64Png,
                        contentType: 'image/png'
                    }
                }
            }
        } catch (err) {
            console.warn('[Studio Renderer] Falling back to default canvas design:', err)
        }
    }

    // Fallback Canvas (Clean, modern GDG Honors Certificate)
    const width = 1920
    const height = 1080
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // Background & Borders
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Border
    ctx.lineWidth = 14
    ctx.strokeStyle = '#2563eb'
    ctx.strokeRect(36, 36, width - 72, height - 72)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#93c5fd'
    ctx.strokeRect(50, 50, width - 100, height - 100)

    // Header
    ctx.fillStyle = '#2563eb'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GOOGLE DEVELOPER GROUPS ON CAMPUS', width / 2, 160)

    // Title
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 64px Georgia, serif'
    const tierTitle = (recipient.award_tier || '').toLowerCase().includes('winner')
        ? 'Certificate of Excellence'
        : 'Certificate of Participation'
    ctx.fillText(tierTitle, width / 2, 260)

    // Awarded To
    ctx.fillStyle = '#64748b'
    ctx.font = 'italic 26px Georgia, serif'
    ctx.fillText('This certificate is proudly presented to', width / 2, 340)

    // Participant Name
    ctx.fillStyle = '#1e3a8a'
    ctx.font = 'bold 68px Georgia, serif'
    ctx.fillText(recipient.name, width / 2, 440)

    // Reg No & Team & Category
    ctx.fillStyle = '#334155'
    ctx.font = 'bold 26px Arial, sans-serif'
    const subInfo = [
        recipient.reg_no ? `Reg No: ${recipient.reg_no}` : '',
        recipient.team_name ? `Team: ${recipient.team_name}` : '',
        recipient.category ? `Category: ${recipient.category}` : ''
    ].filter(Boolean).join('   •   ')
    ctx.fillText(subInfo, width / 2, 510)

    // Event recognition text
    ctx.fillStyle = '#475569'
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText(`For outstanding participation and demonstrated technical proficiency in ${eventName}`, width / 2, 600)

    // Award Tier Pill
    ctx.fillStyle = '#eff6ff'
    ctx.fillRect(width / 2 - 180, 640, 360, 48)
    ctx.strokeStyle = '#bfdbfe'
    ctx.lineWidth = 1
    ctx.strokeRect(width / 2 - 180, 640, 360, 48)

    ctx.fillStyle = '#1d4ed8'
    ctx.font = 'bold 22px Arial, sans-serif'
    ctx.fillText(`★  ${(recipient.award_tier || 'Participation').toUpperCase()}  ★`, width / 2, 672)

    // QR Code
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, verifyUrl, { width: 140, margin: 1 })
    ctx.drawImage(qrCanvas, width / 2 - 70, 740, 140, 140)

    // Unique ID
    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 20px monospace'
    ctx.fillText(`Unique ID: ${certCode}`, width / 2, 915)

    // Convert
    if (format === 'pdf') {
        const canvasDataUrl = canvas.toDataURL('image/jpeg', 0.95)
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [width, height]
        })
        doc.addImage(canvasDataUrl, 'JPEG', 0, 0, width, height)
        const arrayBuffer = doc.output('arraybuffer')
        const base64Pdf = Buffer.from(arrayBuffer).toString('base64')
        return {
            filename: `${cleanReg}.pdf`,
            content: base64Pdf,
            contentType: 'application/pdf'
        }
    } else {
        const pngDataUrl = canvas.toDataURL('image/png', 0.95)
        const base64Png = pngDataUrl.replace(/^data:image\/png;base64,/, '')
        return {
            filename: `${cleanReg}.png`,
            content: base64Png,
            contentType: 'image/png'
        }
    }
}

