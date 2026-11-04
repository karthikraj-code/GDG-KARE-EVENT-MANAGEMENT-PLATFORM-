import crypto from 'crypto'

export interface CertificatePayload {
    id: string
    name: string
    reg_no: string
    dept?: string
    section?: string
    year?: string
    category?: string
    team_name?: string
    type: string
    issue_date?: string
    iat?: number
}

// Derive a deterministic 32-byte (256-bit) encryption key from the environment secret
const SECRET_SEED = 
    process.env.CERTIFICATE_SECRET || 
    process.env.NEXTAUTH_SECRET || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    'gdg-kare-tamper-proof-certificate-key-2026'

const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest()
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

/**
 * Encrypts and digitally authenticates a certificate payload using AES-256-GCM.
 * The output is a compact Base64URL string safe for QR codes and URLs.
 * If anyone tampers with even a single character in the token, decryption fails.
 */
export function encryptCertificatePayload(payload: CertificatePayload): string {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    
    const enrichedPayload: CertificatePayload = {
        ...payload,
        iat: payload.iat || Math.floor(Date.now() / 1000)
    }

    const jsonStr = JSON.stringify(enrichedPayload)
    const ciphertext = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    // Format: [IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext]
    const tokenBuffer = Buffer.concat([iv, tag, ciphertext])
    return tokenBuffer.toString('base64url')
}

/**
 * Decrypts and verifies the cryptographic authenticity tag of the certificate token.
 * Returns the verified CertificatePayload, or null if tampered with or invalid.
 */
export function decryptCertificatePayload(token: string): CertificatePayload | null {
    if (!token || typeof token !== 'string') return null

    try {
        const buffer = Buffer.from(token.trim(), 'base64url')
        
        // Minimum valid length: 12 (IV) + 16 (Tag) + at least 2 bytes of ciphertext
        if (buffer.length < IV_LENGTH + TAG_LENGTH + 2) {
            return null
        }

        const iv = buffer.subarray(0, IV_LENGTH)
        const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
        const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH)

        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
        decipher.setAuthTag(tag)

        const decrypted = decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8')
        return JSON.parse(decrypted) as CertificatePayload
    } catch {
        // Any modification to ciphertext, IV, or tag will cause decipher.final() or JSON.parse to throw
        return null
    }
}

