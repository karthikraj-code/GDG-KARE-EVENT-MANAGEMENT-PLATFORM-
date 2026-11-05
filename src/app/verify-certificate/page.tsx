'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
    CheckCircle2,
    XCircle,
    ShieldCheck,
    Award,
    Search,
    Building2,
    GraduationCap,
    Calendar,
    QrCode,
    Check,
    Copy,
    FileCheck,
    AlertTriangle
} from 'lucide-react'

function VerificationContent() {
    const searchParams = useSearchParams()
    const queryToken = searchParams.get('token') || ''
    const queryId = searchParams.get('id') || searchParams.get('code') || ''

    const [certificateId, setCertificateId] = useState(queryId)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (queryToken) {
            verifyWithParams({ token: queryToken })
        } else if (queryId) {
            verifyWithParams({ id: queryId })
        }
    }, [queryToken, queryId])

    const verifyWithParams = async (params: { token?: string; id?: string }) => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            let endpoint = '/api/verify-certificate'
            if (params.token) {
                endpoint += `?token=${encodeURIComponent(params.token)}`
            } else if (params.id) {
                endpoint += `?id=${encodeURIComponent(params.id.trim())}`
            } else {
                setLoading(false)
                return
            }

            const res = await fetch(endpoint)
            const data = await res.json()

            if (res.ok && data.verified) {
                setResult({
                    ...data.certificate,
                    isEncryptedToken: data.isEncryptedToken,
                    isDatabaseRecord: data.isDatabaseRecord
                })
                if (data.certificate?.certificate_code) {
                    setCertificateId(data.certificate.certificate_code)
                }
            } else {
                setError(data.error || 'This certificate could not be authenticated in the official registry.')
            }
        } catch (err: any) {
            console.error('Verification error:', err)
            setError('Unable to connect to verification server. Please check network connection.')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (certificateId.trim()) {
            verifyWithParams({ id: certificateId.trim() })
        }
    }

    const copyCertificateId = () => {
        if (result?.certificate_code) {
            navigator.clipboard.writeText(result.certificate_code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="min-h-screen bg-white text-black flex flex-col justify-between">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <Image
                            src="/group-2b.png"
                            alt="Google Developer Groups On Campus Kalasalingam Academy Of Research & Education"
                            width={220}
                            height={38}
                            className="h-8 md:h-9 w-auto object-contain"
                            priority
                        />
                        <div className="hidden sm:block border-l border-gray-200 pl-3">
                            <span className="font-bold text-xs tracking-tight text-gray-900 block leading-tight">
                                GDG-KARE Platform
                            </span>
                            <span className="text-blue-600 text-[10px] font-semibold block uppercase tracking-wider">
                                Certificate Verification
                            </span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
                        <ShieldCheck size={14} className="text-blue-600" />
                        <span>Tamper-Proof Verification</span>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
                {/* Search Bar for manual lookup */}
                <div className="mb-8">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={certificateId}
                            onChange={(e) => setCertificateId(e.target.value)}
                            placeholder="Enter Unique Certificate ID (e.g. GDG-KARE-88A1-92B3)..."
                            className="w-full pl-11 pr-28 py-3.5 bg-white border border-gray-300 rounded-2xl text-sm font-mono text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
                        />
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <button
                            type="submit"
                            disabled={loading || !certificateId.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                            {loading ? 'Checking...' : 'Verify'}
                        </button>
                    </form>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200">
                            <ShieldCheck size={32} className="animate-spin" />
                        </div>
                        <h2 className="text-lg font-bold text-black mb-1">Authenticating Credential...</h2>
                        <p className="text-xs text-gray-500 font-mono">Querying cryptographic records for {certificateId}</p>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="bg-white border border-red-200 rounded-3xl p-8 sm:p-10 text-center shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4">
                            <XCircle size={36} />
                        </div>
                        <h2 className="text-xl font-bold text-black mb-2">Verification Failed</h2>
                        <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                            {error}
                        </p>
                        <p className="text-xs text-gray-500">
                            Please verify that the Certificate ID or QR code was issued directly by the GDG-KARE Event Management Platform organizing committee.
                        </p>
                    </div>
                )}

                {/* Success Verification Card */}
                {!loading && result && (() => {
                    const isNotEligible = result.category === 'Not Eligible' || result.eligible === false || result.is_not_eligible === true

                    return (
                        <div className={`relative rounded-3xl p-6 sm:p-10 shadow-sm overflow-hidden border ${isNotEligible
                            ? 'bg-white border-gray-300'
                            : 'bg-white border-gray-200'
                            }`}>
                            {/* Top Verified Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${isNotEligible
                                        ? 'bg-gray-100 border-gray-300 text-gray-700'
                                        : 'bg-blue-50 border-blue-200 text-blue-600'
                                        }`}>
                                        {isNotEligible ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isNotEligible ? 'text-gray-600' : 'text-blue-600'
                                                }`}>
                                                {isNotEligible ? 'Institutional Record' : 'Certificate Details'}
                                            </span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        </div>
                                        <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
                                            <span>Verified</span>
                                            {isNotEligible && <span className="text-gray-600">• NOT ELIGIBLE</span>}
                                        </h1>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">


                                    {/* Award / Tier Distinction Badge */}
                                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase border bg-blue-50 text-blue-800 border-blue-200 flex items-center gap-1.5">
                                        <span>{result.certificate_type || 'Participation'}</span>
                                    </span>

                                    {/* Category Badge */}
                                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide uppercase border ${isNotEligible
                                        ? 'bg-gray-100 text-gray-800 border-gray-300 font-black flex items-center gap-1.5'
                                        : 'bg-blue-50 text-blue-800 border-blue-200'
                                        }`}>
                                        {isNotEligible ? 'NOT ELIGIBLE' : `Category: ${result.category || 'Group 3'}`}
                                    </span>
                                </div>
                            </div>

                            {/* Eligibility Callout Banner for NOT ELIGIBLE participants */}
                            {isNotEligible && (
                                <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-300 flex items-start gap-3.5 text-gray-800">
                                    <AlertTriangle size={24} className="text-gray-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-black uppercase tracking-wide">
                                            Institutional Status: Marked Not Eligible
                                        </h3>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            This participant was enrolled and participated in GDG-KARE Event Management Platform. However, official institutional credit and competition eligibility are officially marked as <strong className="text-black underline">NOT ELIGIBLE</strong> in the database registry.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Certificate Recipient Hero */}
                            <div className="my-8 text-center sm:text-left bg-gray-50 border border-gray-200 rounded-2xl p-6">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">

                                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Participant Details</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-black mt-1 tracking-tight">
                                    {result.name}
                                </h2>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="bg-white text-black border border-gray-200 px-3 py-1 rounded-lg font-mono font-semibold">
                                        Reg No: {result.reg_no}
                                    </span>
                                    {result.dept && (
                                        <span className="bg-white text-gray-700 border border-gray-200 px-3 py-1 rounded-lg font-medium">
                                            {result.dept}
                                        </span>
                                    )}
                                    {isNotEligible && (
                                        <span className="bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1 rounded-lg font-bold">
                                            Not Eligible for Academic Credit
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Verified Credential Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                                {/* Official Event Name */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3 sm:col-span-2">
                                    <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                                        <Award size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Event Name</span>
                                        <span className="text-sm font-bold text-black">{result.event_name || 'GDG-KARE Event Management Platform'}</span>
                                    </div>
                                </div>

                                {/* Department */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Department</span>
                                        <span className="text-sm font-semibold text-black">{result.dept || 'General Engineering'}</span>
                                    </div>
                                </div>

                                {/* Year & Section */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Year & Section</span>
                                        <span className="text-sm font-semibold text-black">
                                            {result.year ? `${result.year}` : 'Active'}
                                            {result.section && ` • Section ${result.section}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Category Distinction */}
                                <div className="border border-gray-200 rounded-2xl p-4 flex items-start gap-3 bg-white">
                                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                        <Award size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Credit / Eligibility</span>
                                        <span className="text-sm font-bold text-black">
                                            {isNotEligible ? 'NOT ELIGIBLE' : result.category || 'Group 3'}
                                        </span>
                                        {isNotEligible && (
                                            <span className="block text-[11px] text-gray-600 font-semibold mt-0.5">
                                                No Academic Credit Granted
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Issue Date */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">Issue Date</span>
                                        <span className="text-sm font-semibold text-black">
                                            {result.issue_date ? new Date(result.issue_date).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            }) : '2026 Academic Season'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Certificate Unique ID Footer */}
                            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[11px] text-gray-500 font-mono uppercase tracking-wider block">Unique Certificate ID</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="font-mono text-sm font-bold text-blue-600 select-all">
                                            {result.certificate_code}
                                        </span>
                                        <button
                                            onClick={copyCertificateId}
                                            className="text-gray-400 hover:text-black transition-colors p-1 cursor-pointer"
                                            title="Copy Certificate ID"
                                        >
                                            {copied ? <Check size={14} className="text-blue-600" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <FileCheck size={16} className="text-blue-600" />
                                    <span>Verified by GDG-KARE Event Management Platform Organizing Board</span>
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* Initial Empty State */}
                {!loading && !result && !error && (
                    <div className="bg-white border border-gray-200 rounded-3xl p-10 text-center shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                            <QrCode size={32} />
                        </div>
                        <h2 className="text-lg font-bold text-black mb-2">Verify a Certificate</h2>
                        <p className="text-xs text-gray-600 max-w-md mx-auto mb-4">
                            Point your mobile device camera at the QR code printed on the official certificate, or paste the Certificate ID above to view verified participant credentials.
                        </p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 py-6 px-4 bg-white">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/group-2b.png"
                            alt="GDG KARE Logo"
                            width={160}
                            height={28}
                            className="h-5 w-auto object-contain"
                        />
                        <span className="hidden md:inline-block border-l border-gray-200 pl-3 font-semibold text-[11px] text-gray-700">
                            GDG-KARE Event Management Platform
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Image
                            src="/gdg-logo.png"
                            alt="GDG Logo"
                            width={16}
                            height={16}
                            className="h-3.5 w-auto object-contain"
                        />
                        <p>© {new Date().getFullYear()} GDG-KARE Event Management Platform. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default function VerifyCertificatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center text-black">
                <div className="animate-pulse text-sm">Loading verification portal...</div>
            </div>
        }>
            <VerificationContent />
        </Suspense>
    )
}
