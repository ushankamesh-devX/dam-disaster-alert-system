import React, { useEffect, useState, useCallback } from 'react';
import { Drawer, Paper, Typography, Dialog } from '@mui/material';
import { StatusChip as Badge, LoadingSkeleton as Skeleton, AppButton } from '../../components/ui/controls';
import SymbolIcon from '../../components/ui/SymbolIcon';
import { getReportById } from '../../services/report.service';

const priorityColors = {
    low: 'bg-gray-50 text-gray-600 border-gray-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
};

const statusColors = {
    pending: 'bg-gray-100 text-gray-700 border-gray-200',
    reviewing: 'bg-purple-100 text-purple-700 border-purple-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    duplicate: 'bg-orange-100 text-orange-700 border-orange-200',
};

function getMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
        try {
            const parsed = new URL(apiUrl);
            return `${parsed.origin}${cleanPath}`;
        } catch {
            return cleanPath;
        }
    }
    return cleanPath;
}

export default function ReportDetailDrawer({
    reportId,
    onClose,
    onOpenStatus,
    onOpenAssign,
    refreshTrigger,
}) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [failedImages, setFailedImages] = useState({});

    const fetchDetail = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        setError(null);
        setFailedImages({});
        try {
            const data = await getReportById(id);
            setReport(data);
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load report details');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (reportId) {
            fetchDetail(reportId);
        } else {
            setReport(null);
        }
    }, [reportId, refreshTrigger, fetchDetail]);

    // Gather all media items (from media array or mediaUrls strings)
    const mediaItems = [];
    if (report?.media && report.media.length > 0) {
        report.media.forEach(m => {
            const rawUrl = m.mediaUrl || m.url || '';
            const fullUrl = getMediaUrl(rawUrl);
            const isVideo = m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(rawUrl);
            mediaItems.push({
                url: fullUrl,
                fileName: m.fileName || 'Attachment',
                isVideo,
                sizeBytes: m.fileSizeBytes,
            });
        });
    } else if (report?.mediaUrls && report.mediaUrls.length > 0) {
        report.mediaUrls.forEach((url, i) => {
            const fullUrl = getMediaUrl(url);
            const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(url);
            mediaItems.push({
                url: fullUrl,
                fileName: `Attachment ${i + 1}`,
                isVideo,
            });
        });
    }

    return (
        <>
            <Drawer
                anchor="right"
                open={Boolean(reportId)}
                onClose={onClose}
                slotProps={{
                    backdrop: {
                        className: 'bg-black/30 backdrop-blur-[1px]',
                    },
                }}
                PaperProps={{
                    className: 'w-full sm:max-w-xl md:max-w-2xl bg-white flex flex-col shadow-2xl',
                    style: { width: '100%', maxWidth: '640px' },
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            <SymbolIcon name="report" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <Typography component="h2" variant="h6" className="text-base font-bold text-gray-900">
                                    {report?.reportNumber || 'Report Details'}
                                </Typography>
                                {report?.status && (
                                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusColors[report.status] || 'bg-gray-100 text-gray-700'}`}>
                                        {report.status.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">
                                {report?.createdAt ? `Submitted on ${new Date(report.createdAt).toLocaleString()}` : 'Incident report preview'}
                            </p>
                        </div>
                    </div>
                    <AppButton iconOnly aria-label="Close drawer" onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <SymbolIcon name="close" />
                    </AppButton>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-3/4 rounded-lg" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <div className="grid grid-cols-2 gap-3">
                                <Skeleton className="h-16 rounded-xl" />
                                <Skeleton className="h-16 rounded-xl" />
                            </div>
                            <Skeleton className="h-40 rounded-xl" />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100 my-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-xl font-bold">!</div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">Failed to load report</p>
                            <p className="text-xs text-gray-500 mb-4">{error}</p>
                            <AppButton variant="contained" onClick={() => fetchDetail(reportId)}>Retry</AppButton>
                        </div>
                    ) : report ? (
                        <>
                            {/* Action Buttons Toolbar */}
                            <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200/70">
                                <span className="text-xs font-medium text-gray-600">Quick Actions:</span>
                                <div className="flex gap-2">
                                    <AppButton
                                        variant="outlined"
                                        size="small"
                                        onClick={() => onOpenStatus(report)}
                                        className="text-xs font-semibold"
                                    >
                                        <SymbolIcon name="check" className="mr-1 text-sm" /> Change Status
                                    </AppButton>
                                    <AppButton
                                        variant="outlined"
                                        size="small"
                                        onClick={() => onOpenAssign(report)}
                                        className="text-xs font-semibold"
                                    >
                                        <SymbolIcon name="users" className="mr-1 text-sm" /> Assign Officer
                                    </AppButton>
                                </div>
                            </div>

                            {/* Section: Title & Description */}
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <Typography component="h3" variant="h6" className="text-lg font-bold text-gray-900 leading-snug">
                                        {report.title || 'Untitled Report'}
                                    </Typography>
                                    {report.priority && (
                                        <Badge className={`shrink-0 text-xs font-medium border ${priorityColors[report.priority] || priorityColors.medium}`}>
                                            Priority: {report.priority}
                                        </Badge>
                                    )}
                                </div>
                                <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</p>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {report.description || 'No description provided.'}
                                    </p>
                                </div>
                            </div>

                            {/* Section: Dam & Issue Type Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3.5 bg-white rounded-xl border border-gray-200">
                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                                        Dam / Location
                                    </span>
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                        <SymbolIcon name="dam" className="text-blue-500 text-sm" />
                                        <span>{report.damName || 'Unknown Dam'}</span>
                                    </div>
                                    {report.locationDescription && (
                                        <p className="text-xs text-gray-500 mt-1">{report.locationDescription}</p>
                                    )}
                                    {report.latitude && report.longitude && (
                                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                            GPS: {report.latitude}, {report.longitude}
                                        </p>
                                    )}
                                </div>

                                <div className="p-3.5 bg-white rounded-xl border border-gray-200">
                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                                        Issue Type
                                    </span>
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                        <SymbolIcon name="tag" className="text-purple-500 text-sm" />
                                        <span>{report.reportTypeName || report.reportTypeCode || 'General Issue'}</span>
                                    </div>
                                    {report.reportTypeCode && (
                                        <p className="text-xs text-gray-400 mt-1">Code: {report.reportTypeCode}</p>
                                    )}
                                </div>
                            </div>

                            {/* Section: Reporter Details */}
                            <Paper variant="outlined" className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                        <SymbolIcon name="users" className="text-blue-500" /> Reporter Contact Information
                                    </span>
                                    {report.isAnonymous && (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                            Anonymous Submission
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-400">Reporter Name</p>
                                        <p className="font-medium text-gray-900">
                                            {report.isAnonymous ? 'Anonymous Resident' : (report.userName || 'Resident')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Email</p>
                                        {report.userEmail ? (
                                            <a href={`mailto:${report.userEmail}`} className="text-blue-600 hover:underline font-medium text-sm">
                                                {report.userEmail}
                                            </a>
                                        ) : (
                                            <p className="text-gray-400 italic text-sm">Not provided</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Phone</p>
                                        {report.userPhone ? (
                                            <a href={`tel:${report.userPhone}`} className="text-blue-600 hover:underline font-medium text-sm">
                                                {report.userPhone}
                                            </a>
                                        ) : (
                                            <p className="text-gray-400 italic text-sm">Not provided</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">User ID</p>
                                        <p className="text-gray-700 font-mono text-xs">{report.userId ?? 'None'}</p>
                                    </div>
                                </div>
                            </Paper>

                            {/* Section: Assignment & Timeline */}
                            <Paper variant="outlined" className="p-4 rounded-xl border border-gray-200 bg-white space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                                        <SymbolIcon name="clock" className="text-gray-500" /> Assignment & History
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-400">Assigned Officer</p>
                                        <p className="font-semibold text-gray-900">
                                            {report.assignedToName || <span className="text-gray-400 font-normal italic">Unassigned</span>}
                                        </p>
                                        {report.assignedAt && (
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Assigned: {new Date(report.assignedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Timestamps</p>
                                        <p className="text-xs text-gray-600">Created: {report.createdAt ? new Date(report.createdAt).toLocaleString() : '-'}</p>
                                        <p className="text-xs text-gray-600">Updated: {report.updatedAt ? new Date(report.updatedAt).toLocaleString() : '-'}</p>
                                    </div>
                                </div>

                                {report.resolutionNotes && (
                                    <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="text-xs font-semibold text-emerald-800">Resolution Notes</p>
                                        <p className="text-xs text-emerald-950 mt-1 whitespace-pre-wrap">{report.resolutionNotes}</p>
                                        {report.resolvedAt && (
                                            <p className="text-[10px] text-emerald-700 mt-1">Resolved at: {new Date(report.resolvedAt).toLocaleString()}</p>
                                        )}
                                    </div>
                                )}

                                {report.rejectionReason && (
                                    <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
                                        <p className="text-xs font-semibold text-red-800">Rejection Reason</p>
                                        <p className="text-xs text-red-950 mt-1 whitespace-pre-wrap">{report.rejectionReason}</p>
                                    </div>
                                )}
                            </Paper>

                            {/* Section: Media Gallery */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Typography component="h3" variant="h6" className="text-sm font-bold text-gray-900">
                                        Attached Media ({mediaItems.length})
                                    </Typography>
                                </div>

                                {mediaItems.length === 0 ? (
                                    <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-xs text-gray-400">No photos or videos attached to this report.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {mediaItems.map((item, idx) => (
                                            <div key={idx} className="flex flex-col">
                                                {item.isVideo ? (
                                                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-black shadow-sm">
                                                        <video
                                                            src={item.url}
                                                            controls
                                                            className="w-full h-44 object-contain bg-black"
                                                            onError={() => console.warn('[ReportDetail] Failed to load video:', item.url)}
                                                        >
                                                            Your browser does not support the video tag.
                                                        </video>
                                                        <div className="px-3 py-1.5 bg-gray-900 text-white flex items-center justify-between text-[11px]">
                                                            <span className="truncate max-w-[200px]">{item.fileName}</span>
                                                            <span className="text-gray-400">VIDEO</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => !failedImages[idx] && setPreviewImage(item.url)}
                                                        className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 cursor-pointer shadow-sm hover:shadow-md transition"
                                                    >
                                                        {failedImages[idx] ? (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-gray-400 bg-gray-50">
                                                                <SymbolIcon name="warning" className="text-gray-400 mb-1" />
                                                                <span className="text-xs font-medium">Image unavailable</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <img
                                                                    src={item.url}
                                                                    alt={item.fileName || 'Report attachment'}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                                    onError={() => {
                                                                        console.warn('[ReportDetail] Failed to load image:', item.url);
                                                                        setFailedImages(prev => ({ ...prev, [idx]: true }));
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                                                                    <span className="bg-black/60 px-2.5 py-1 rounded-md text-xs flex items-center gap-1 font-medium">
                                                                        <SymbolIcon name="view" /> View full size
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            </Drawer>

            {/* Full-size Image Preview Modal */}
            <Dialog
                open={Boolean(previewImage)}
                onClose={() => setPreviewImage(null)}
                maxWidth="lg"
                slotProps={{
                    backdrop: { className: 'bg-black/80' },
                    paper: { className: 'bg-transparent shadow-none p-0 max-h-[90vh]' },
                }}
            >
                <div className="relative flex flex-col items-center">
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute -top-10 right-0 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full cursor-pointer transition z-20"
                        aria-label="Close image preview"
                    >
                        <SymbolIcon name="close" />
                    </button>
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Full-size attachment preview"
                            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                        />
                    )}
                </div>
            </Dialog>
        </>
    );
}
