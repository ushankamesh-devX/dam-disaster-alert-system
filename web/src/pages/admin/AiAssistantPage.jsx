import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import FormatQuoteRounded from '@mui/icons-material/FormatQuoteRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';
import { extractTextFromPdf } from '../../utils/pdfParser';
import MarkdownRenderer from '../../components/common/MarkdownRenderer';
import LiveTelemetryCard from '../../components/ai/LiveTelemetryCard';
import ForecastTimelineCard from '../../components/ai/ForecastTimelineCard';
import SensorsMatrixCard from '../../components/ai/SensorsMatrixCard';
import WaterLevelTrendChartCard from '../../components/ai/WaterLevelTrendChartCard';
import {
    askAiChat,
    getAiDocuments,
    uploadAiDocument,
    deleteAiDocument,
} from '../../services/aiRag.service';
import { getAllDamsList } from '../../services/dam.service';

export default function AiAssistantPage() {
    const [activeTab, setActiveTab] = useState('chat'); // chat | documents
    const [dams, setDams] = useState([]);
    const [selectedDamId, setSelectedDamId] = useState('');

    // Chat state
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Hello. I am the DDAS Operational Assistant. I provide answers strictly grounded in verified Dam Standard Operating Procedures (SOPs), Emergency Action Plans (EAPs), and technical manuals.',
            sources: [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
    ]);
    const [inputQuery, setInputQuery] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Document management state
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [parsingPdf, setParsingPdf] = useState(false);
    const [pdfInfo, setPdfInfo] = useState(null);
    const fileInputRef = useRef(null);
    const [docForm, setDocForm] = useState({
        title: '',
        category: 'sop',
        damId: '',
        content: '',
        metadata: {},
    });

    const loadDams = useCallback(async () => {
        try {
            const list = await getAllDamsList();
            setDams(list || []);
        } catch {
            // Ignore optional dam list load error
        }
    }, []);

    const loadDocuments = useCallback(async () => {
        setLoadingDocs(true);
        try {
            const res = await getAiDocuments();
            const docs = Array.isArray(res) ? res : (res?.data || []);
            setDocuments(Array.isArray(docs) ? docs : []);
        } catch {
            toast.error('Failed to load operational documents');
        } finally {
            setLoadingDocs(false);
        }
    }, []);

    useEffect(() => {
        loadDams();
        loadDocuments();
    }, [loadDams, loadDocuments]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (queryText = inputQuery) => {
        const q = (queryText || '').trim();
        if (!q || sending) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMsg = { role: 'user', text: q, timestamp: timeStr };
        setMessages((prev) => [...prev, userMsg]);
        setInputQuery('');
        setSending(true);

        try {
            const res = await askAiChat(q, selectedDamId || null);
            // Defensively unwrap any nesting (Axios / Spring ApiResponse / FastAPI)
            const resolvedAnswer = (
                res?.answer ||
                res?.data?.answer ||
                res?.data?.data?.answer ||
                (typeof res === 'string' ? res : null) ||
                res?.message ||
                res?.data?.message ||
                'No answer generated. Please try rephrasing your inquiry.'
            );
            const resolvedSources = (
                res?.sources ||
                res?.data?.sources ||
                res?.data?.data?.sources ||
                []
            );

            const resolvedTelemetry = res?.telemetry || res?.data?.telemetry || res?.data?.data?.telemetry || null;
            const resolvedOverflow = res?.overflow_config || res?.data?.overflow_config || res?.data?.data?.overflow_config || null;
            const resolvedForecasts = res?.forecasts || res?.data?.forecasts || res?.data?.data?.forecasts || null;
            const resolvedSensors = res?.sensors || res?.data?.sensors || res?.data?.data?.sensors || null;
            const resolvedChartData = res?.chart_data || res?.data?.chart_data || res?.data?.data?.chart_data || null;
            const resolvedDamId = res?.dam_id || res?.data?.dam_id || (selectedDamId ? Number(selectedDamId) : null);

            const aiMsg = {
                role: 'assistant',
                text: typeof resolvedAnswer === 'string' && resolvedAnswer.trim() ? resolvedAnswer.trim() : 'No answer generated.',
                sources: Array.isArray(resolvedSources) ? resolvedSources : [],
                telemetry: resolvedTelemetry,
                overflowConfig: resolvedOverflow,
                forecasts: resolvedForecasts,
                sensors: resolvedSensors,
                chartData: resolvedChartData,
                damId: resolvedDamId,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch (err) {
            console.error('AI chat inquiry error:', err);
            const errorDetail = err?.response?.data?.message 
                || (err?.code === 'ECONNABORTED' ? 'AI inquiry timed out. The operational model is taking longer than expected.' : null)
                || err?.message 
                || 'An error occurred while retrieving operational documentation. Please verify the AI backend connection.';
            toast.error(errorDetail);
            const errorMsg = {
                role: 'assistant',
                text: errorDetail,
                sources: [],
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setSending(false);
        }
    };

    const handlePdfSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Please select a valid PDF file');
            return;
        }

        setParsingPdf(true);
        const toastId = toast.loading(`Parsing PDF: ${file.name}...`);
        try {
            const { text, pageCount, wordCount } = await extractTextFromPdf(file);
            if (!text.trim()) {
                toast.error('No extractable text found in this PDF (it might be a scanned image)', { id: toastId });
                return;
            }

            // Derive a clean document title from the filename
            const cleanTitle = file.name
                .replace(/\.[^/.]+$/, '')
                .replace(/[-_]+/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());

            setDocForm((prev) => ({
                ...prev,
                title: prev.title || cleanTitle,
                content: text,
                metadata: {
                    ...(prev.metadata || {}),
                    fileName: file.name,
                    pageCount,
                    fileSize: file.size,
                    parsedAt: new Date().toISOString(),
                },
            }));

            setPdfInfo({
                fileName: file.name,
                pageCount,
                wordCount,
            });

            toast.success(`Extracted ${pageCount} pages (${wordCount.toLocaleString()} words)`, { id: toastId });
        } catch (err) {
            console.error('PDF parsing error:', err);
            toast.error(`Failed to parse PDF: ${err.message || 'Unknown error'}`, { id: toastId });
        } finally {
            setParsingPdf(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClearPdf = () => {
        setPdfInfo(null);
        setDocForm((prev) => ({
            ...prev,
            content: '',
            metadata: {},
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUploadDoc = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            await uploadAiDocument(docForm);
            toast.success('Operational document indexed successfully');
            setUploadModalOpen(false);
            setPdfInfo(null);
            setDocForm({ title: '', category: 'sop', damId: '', content: '', metadata: {} });
            loadDocuments();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Indexing failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!confirm('Are you sure you want to deactivate this document from retrieval?')) return;
        try {
            await deleteAiDocument(docId);
            toast.success('Document deactivated');
            loadDocuments();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Deactivation failed');
        }
    };

    const quickQueries = [
        'How did the water level change this month? Show in a graph',
        'What is the current water level and live telemetry?',
        'What sensors are installed and their warning thresholds?',
        'How should spillway gates be operated during high reservoir inflow?',
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SmartToyRounded sx={{ fontSize: 32, color: 'primary.main' }} />
                    <div>
                        <Typography variant="h5" fontWeight={800}>
                            SOP Knowledge Base & Operational Assistant
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Grounded conversational retrieval over dam operating procedures, flood protocols, and technical manuals
                        </Typography>
                    </div>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshRounded />}
                        onClick={loadDocuments}
                        sx={{ borderRadius: 2 }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={() => setUploadModalOpen(true)}
                        sx={{ borderRadius: 2 }}
                    >
                        Index Manual / SOP
                    </Button>
                </Box>
            </Box>

            {/* Navigation Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Button
                        onClick={() => setActiveTab('chat')}
                        sx={{
                            px: 3,
                            py: 1.75,
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: 0,
                            borderBottom: activeTab === 'chat' ? '2px solid' : 'none',
                            borderColor: 'primary.main',
                            color: activeTab === 'chat' ? 'primary.main' : 'text.secondary',
                        }}
                    >
                        Operational Assistant Chat
                    </Button>
                    <Button
                        onClick={() => setActiveTab('documents')}
                        sx={{
                            px: 3,
                            py: 1.75,
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: 0,
                            borderBottom: activeTab === 'documents' ? '2px solid' : 'none',
                            borderColor: 'primary.main',
                            color: activeTab === 'documents' ? 'primary.main' : 'text.secondary',
                        }}
                    >
                        Document Library ({documents.length})
                    </Button>
                </Box>

                {/* Tab 1: Grounded Chat */}
                {activeTab === 'chat' && (
                    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Scope Selector & Quick Questions */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', pb: 1, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                            <FormControl size="small" sx={{ minWidth: 220 }}>
                                <InputLabel>Operational Scope</InputLabel>
                                <Select
                                    value={selectedDamId}
                                    label="Operational Scope"
                                    onChange={(e) => setSelectedDamId(e.target.value)}
                                >
                                    <MenuItem value="">All Dams / Global Manuals</MenuItem>
                                    {dams.map((d) => (
                                        <MenuItem key={d.id} value={d.id}>
                                            {d.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                    Suggested:
                                </Typography>
                                {quickQueries.map((qq, idx) => (
                                    <Chip
                                        key={idx}
                                        size="small"
                                        label={qq}
                                        onClick={() => handleSendMessage(qq)}
                                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'grey.200' } }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        {/* Chat Messages Log */}
                        <Box
                            sx={{
                                height: 440,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                                p: 1.5,
                                backgroundColor: 'grey.50',
                                borderRadius: 2,
                            }}
                        >
                            {messages.map((m, idx) => {
                                const isUser = m.role === 'user';
                                return (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                                            maxWidth: { xs: '95%', md: '85%' },
                                        }}
                                    >
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2.5,
                                                backgroundColor: isUser ? 'primary.main' : '#ffffff',
                                                color: isUser ? '#ffffff' : 'text.primary',
                                                border: isUser ? 'none' : '1px solid',
                                                borderColor: 'divider',
                                            }}
                                        >
                                            {isUser ? (
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                                                    {m.text}
                                                </Typography>
                                            ) : (
                                                <MarkdownRenderer content={m.text || 'No response available.'} />
                                            )}

                                            {/* Operational UI Widgets */}
                                            {!isUser && (
                                                <>
                                                    <LiveTelemetryCard
                                                        telemetry={m.telemetry}
                                                        overflowConfig={m.overflowConfig}
                                                        damId={m.damId}
                                                    />
                                                    <ForecastTimelineCard
                                                        forecasts={m.forecasts}
                                                        damId={m.damId}
                                                    />
                                                    <SensorsMatrixCard
                                                        sensors={m.sensors}
                                                        damId={m.damId}
                                                    />
                                                    <WaterLevelTrendChartCard
                                                        chartData={m.chartData}
                                                    />
                                                </>
                                            )}

                                            {/* Citations Accordion */}
                                            {m.sources && m.sources.length > 0 && (
                                                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'grey.200' }}>
                                                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <FormatQuoteRounded sx={{ fontSize: 16 }} />
                                                        Verified Operational Citations ({m.sources.length}):
                                                    </Typography>
                                                    {m.sources.map((src, sIdx) => (
                                                        <Accordion key={sIdx} elevation={0} sx={{ mt: 0.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 1.5, '&:before': { display: 'none' } }}>
                                                            <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ minHeight: 36, py: 0.5 }}>
                                                                <Typography variant="caption" fontWeight={600} color="primary.main">
                                                                    [{sIdx + 1}] {src.title} (v{src.version}) — {Math.round(src.score * 100)}% Match
                                                                </Typography>
                                                            </AccordionSummary>
                                                            <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {src.excerpt}
                                                                </Typography>
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    ))}
                                                </Box>
                                            )}
                                        </Paper>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ mt: 0.5, px: 1, alignSelf: isUser ? 'flex-end' : 'flex-start' }}
                                        >
                                            {m.timestamp}
                                        </Typography>
                                    </Box>
                                );
                            })}
                            {sending && (
                                <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                                    <CircularProgress size={18} />
                                    <Typography variant="caption" color="text.secondary">
                                        Searching verified operational manuals and synthesizing response...
                                    </Typography>
                                </Box>
                            )}
                            <div ref={messagesEndRef} />
                        </Box>

                        {/* Input bar */}
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                            <TextField
                                fullWidth
                                placeholder="Ask about spillway procedures, inflow rules, siren alarms, or specs..."
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                disabled={sending}
                                size="small"
                                sx={{ backgroundColor: '#ffffff', borderRadius: 2 }}
                            />
                            <Button
                                variant="contained"
                                endIcon={<SendRounded />}
                                onClick={() => handleSendMessage()}
                                disabled={sending || !inputQuery.trim()}
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                Send
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Tab 2: Document Library */}
                {activeTab === 'documents' && (
                    <Box sx={{ p: 3 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Document Title</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Dam Scope</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Version</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Chunks</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Updated</TableCell>
                                    <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loadingDocs ? (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                            <CircularProgress size={24} />
                                        </TableCell>
                                    </TableRow>
                                ) : documents.length > 0 ? (
                                    documents.map((doc) => (
                                        <TableRow key={doc.doc_id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {doc.metadata?.fileName ? (
                                                        <PictureAsPdfRounded sx={{ fontSize: 18, color: 'error.main' }} />
                                                    ) : (
                                                        <MenuBookRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                    )}
                                                    {doc.title}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip size="small" label={doc.category?.toUpperCase()} variant="outlined" />
                                            </TableCell>
                                            <TableCell>{doc.dam_id ? `Dam #${doc.dam_id}` : 'Global (All Dams)'}</TableCell>
                                            <TableCell>v{doc.version}</TableCell>
                                            <TableCell>{doc.chunk_count} chunks</TableCell>
                                            <TableCell>{doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : '—'}</TableCell>
                                            <TableCell sx={{ textAlign: 'right' }}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteDoc(doc.doc_id)}
                                                    title="Deactivate document"
                                                >
                                                    <DeleteOutlineRounded />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                            No operational documents indexed. Click "Index Manual / SOP" to add emergency procedures.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Paper>

            {/* Modal: Index Document */}
            <Dialog
                open={uploadModalOpen}
                onClose={() => {
                    setUploadModalOpen(false);
                    handleClearPdf();
                }}
                maxWidth="sm"
                fullWidth
            >
                <form onSubmit={handleUploadDoc}>
                    <DialogTitle fontWeight={700}>Index Operational Manual or SOP</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                        {/* PDF Drag & Drop / File Upload Card */}
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                border: '2px dashed',
                                borderColor: pdfInfo ? 'success.main' : 'primary.light',
                                backgroundColor: pdfInfo ? 'rgba(46, 125, 50, 0.04)' : 'grey.50',
                                textAlign: 'center',
                                cursor: parsingPdf ? 'wait' : 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    backgroundColor: 'action.hover',
                                },
                            }}
                            onClick={() => !parsingPdf && fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="application/pdf,.pdf"
                                style={{ display: 'none' }}
                                onChange={handlePdfSelect}
                            />
                            {parsingPdf ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 1 }}>
                                    <CircularProgress size={24} />
                                    <Typography variant="body2" color="primary.main" fontWeight={600}>
                                        Extracting text from PDF pages...
                                    </Typography>
                                </Box>
                            ) : pdfInfo ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textAlign: 'left' }}>
                                        <PictureAsPdfRounded sx={{ color: 'error.main', fontSize: 32 }} />
                                        <div>
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                {pdfInfo.fileName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {pdfInfo.pageCount} Pages • {pdfInfo.wordCount.toLocaleString()} Words extracted
                                            </Typography>
                                        </div>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearPdf();
                                        }}
                                        title="Clear PDF"
                                    >
                                        <CloseRounded fontSize="small" />
                                    </IconButton>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, py: 1 }}>
                                    <UploadFileRounded sx={{ color: 'primary.main', fontSize: 32 }} />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Upload PDF Document (SOP / Manual / EAP)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Click to browse or drag & drop a .pdf file to extract text automatically
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        <TextField
                            label="Document Title"
                            required
                            fullWidth
                            value={docForm.title}
                            onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                            placeholder="e.g. Victoria Dam Emergency Gate Operation SOP"
                        />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={docForm.category}
                                    label="Category"
                                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                                >
                                    <MenuItem value="sop">Standard Operating Procedure (SOP)</MenuItem>
                                    <MenuItem value="eap">Emergency Action Plan (EAP)</MenuItem>
                                    <MenuItem value="specifications">Dam Technical Specifications</MenuItem>
                                    <MenuItem value="guidelines">General Guidelines</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Dam Scope</InputLabel>
                                <Select
                                    value={docForm.damId}
                                    label="Dam Scope"
                                    onChange={(e) => setDocForm({ ...docForm, damId: e.target.value })}
                                >
                                    <MenuItem value="">Global (All Dams)</MenuItem>
                                    {dams.map((d) => (
                                        <MenuItem key={d.id} value={d.id}>
                                            {d.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <TextField
                            label="Document Content / Text Passages"
                            multiline
                            rows={8}
                            required
                            fullWidth
                            value={docForm.content}
                            onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                            placeholder="Paste the operational procedure or emergency guidelines text here..."
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setUploadModalOpen(false)} color="inherit">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={uploading}>
                            {uploading ? 'Indexing...' : 'Index Document'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}

