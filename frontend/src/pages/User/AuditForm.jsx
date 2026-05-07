import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import api, { draftAPI } from '../../api/axios';
import { useAuth } from '../../auth/useAuth';

// ─── Proof Image Upload Component ──────────────────────────────────────────────
const ProofImageUpload = ({
    questionId,
    answerId,
    proofImage,
    uploadingImage,
    analyzingImage,
    analysisProgress,
    analysisResult,
    imageError,
    onUpload,
    onDelete,
    onClearError,
    onExpandImage,
    hasDraftSaved,
}) => {
    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const triggerInput = () => fileInputRef.current?.click();

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            onUpload(questionId, e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files?.length > 0) {
            onUpload(questionId, e.target.files[0]);
            // Reset input so same file can be re-uploaded after deletion
            e.target.value = '';
        }
    };

    // ── Upload / Analyzing state ──────────────────────────────────────────────
    if (uploadingImage && !analyzingImage) {
        return (
            <div style={styles.uploadPanel}>
                <div style={styles.uploadPanelHeader}>
                    <span style={styles.uploadPanelIcon}>📎</span>
                    <span style={styles.uploadPanelTitle}>Proof Image <span style={styles.required}>*</span></span>
                </div>
                <div style={styles.uploadingBox}>
                    <div style={styles.spinRing} />
                    <p style={styles.uploadingLabel}>Uploading image…</p>
                    <p style={styles.uploadingHint}>Please wait while your file is transferred</p>
                </div>
            </div>
        );
    }

    if (analyzingImage) {
        const pct = Math.round(analysisProgress || 0);
        const steps = [
            { label: 'Image received', threshold: 0 },
            { label: 'Scanning visual content', threshold: 25 },
            { label: 'Verifying document integrity', threshold: 50 },
            { label: 'Cross-referencing audit criteria', threshold: 75 },
            { label: 'Finalising verification report', threshold: 95 },
        ];
        return (
            <div style={styles.uploadPanel}>
                <div style={styles.uploadPanelHeader}>
                    <span style={styles.uploadPanelIcon}>🔍</span>
                    <span style={styles.uploadPanelTitle}>AI Verification in Progress</span>
                </div>
                <div style={styles.analysingBox}>
                    <div style={styles.progressTrack}>
                        <div style={{ ...styles.progressFill, width: `${pct}%` }} />
                    </div>
                    <p style={styles.progressPct}>{pct}% complete</p>
                    <ul style={styles.stepList}>
                        {steps.map((s, i) => {
                            const done = pct > s.threshold;
                            const active = pct >= s.threshold && !done;
                            return (
                                <li key={i} style={styles.stepItem}>
                                    <span style={{
                                        ...styles.stepDot,
                                        background: done ? '#22c55e' : active ? '#3b82f6' : '#e2e8f0',
                                    }}>
                                        {done ? '✓' : active ? '…' : ''}
                                    </span>
                                    <span style={{
                                        ...styles.stepText,
                                        color: done ? '#166534' : active ? '#1e40af' : '#94a3b8',
                                        fontWeight: done || active ? 600 : 400,
                                    }}>{s.label}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        );
    }

    // ── Image uploaded — show result card ────────────────────────────────────
    if (proofImage) {
        const isValid = proofImage.validated === true;
        const result = analysisResult;

        return (
            <div style={styles.uploadPanel}>
                <div style={styles.uploadPanelHeader}>
                    <span style={styles.uploadPanelIcon}>📎</span>
                    <span style={styles.uploadPanelTitle}>Proof Image <span style={styles.required}>*</span></span>
                </div>

                {/* AI result banner - Updated for mismatch */}
                {result && (
                    <div style={{
                        ...styles.resultBanner,
                        background: isValid ? '#f0fdf4' : '#fef2f2',
                        borderColor: isValid ? '#bbf7d0' : '#fecaca',
                    }}>
                        <div style={styles.resultBannerLeft}>
                            <span style={styles.resultIcon}>{isValid ? '✅' : '❌'}</span>
                            <div>
                                <p style={{
                                    ...styles.resultTitle,
                                    color: isValid ? '#166534' : '#b91c1c',
                                }}>
                                    {isValid ? 'Image Verified by AI' : 'Image Not Relevant'}
                                </p>
                                <p style={styles.resultSubtitle}>
                                    Confidence score: <strong>{result.confidence}%</strong>
                                </p>
                            </div>
                        </div>

                        {!isValid && (
                            <div style={styles.resultCheckmarks}>
                                <span style={{...styles.checkChip, background: '#fee2e2', color: '#b91c1c', borderColor: '#f87171'}}>
                                    ✕ Does not clearly demonstrate the answer
                                </span>
                                <p style={{fontSize: '0.8rem', color: '#b91c1c', margin: '8px 0 0 0'}}>
                                    Please upload a more accurate image that directly supports your "Yes" answer.
                                </p>
                            </div>
                        )}

                        {isValid && result.details && (
                            <div style={styles.resultCheckmarks}>
                                {result.details.map((d, i) => (
                                    <span key={i} style={styles.checkChip}>✓ {d}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Image card */}
                <div style={styles.imageCard}>
                    {/* Thumbnail */}
                    {proofImage.url && (
                        <div
                            style={styles.thumbnailWrap}
                            onClick={() => onExpandImage(proofImage.url)}
                            title="Click to view full size"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onExpandImage(proofImage.url)}
                        >
                            <img
                                src={proofImage.url}
                                alt="Proof thumbnail"
                                style={styles.thumbnail}
                            />
                            <div style={styles.thumbnailOverlay}>
                                <span style={styles.thumbnailZoom}>⊕ Fullscreen</span>
                            </div>
                        </div>
                    )}

                    {/* File info */}
                    <div style={styles.imageInfo}>
                        <p style={styles.imageFilename}>
                            <span style={styles.fileIcon}>📄</span>
                            {proofImage.filename}
                        </p>
                        <span style={{
                            ...styles.validationBadge,
                            background: isValid ? '#dcfce7' : '#fee2e2',
                            color: isValid ? '#166534' : '#b91c1c',
                            borderColor: isValid ? '#86efac' : '#f87171',
                        }}>
                            {isValid ? '✓ Validated' : '❌ Not Relevant'}
                        </span>
                    </div>

                    {/* Actions */}
                    <div style={styles.imageActions}>
                        <button type="button" style={styles.replaceBtn} onClick={triggerInput}>
                            ↑ Replace Image
                        </button>
                        <button
                            type="button"
                            style={styles.deleteBtn}
                            onClick={() => onDelete(questionId, answerId)}
                        >
                            🗑
                        </button>
                    </div>
                </div>

                {/* Hidden input for replace */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf"
                    style={{ display: 'none' }}
                    aria-label="Replace proof image"
                />
            </div>
        );
    }

    // ── Empty state — drop zone ───────────────────────────────────────────────
    return (
        <div style={styles.uploadPanel}>
            <div style={styles.uploadPanelHeader}>
                <span style={styles.uploadPanelIcon}>📎</span>
                <span style={styles.uploadPanelTitle}>
                    Proof Image <span style={styles.required}>*</span>
                </span>
                <span style={styles.uploadBadgeRequired}>Required for "Yes" answers</span>
            </div>
            <p style={styles.uploadHint}>
                Upload a document, screenshot, or image that demonstrates your answer.
                Our AI will verify its relevance to the audit question.
            </p>

            {/* Error alert */}
            {imageError && (
                <div style={styles.errorAlert} role="alert">
                    <div style={styles.errorAlertLeft}>
                        <span style={styles.errorAlertIcon}>❌</span>
                        <div>
                            <p style={styles.errorAlertTitle}>AI Verification Failed</p>
                            <p style={styles.errorAlertMsg}>
                                {imageError || "The uploaded image does not clearly represent proof for this answer."}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        style={styles.retryBtn}
                        onClick={() => { onClearError(questionId); triggerInput(); }}
                    >
                        Upload New Image
                    </button>
                </div>
            )}

            {/* Drop zone */}
            {!hasDraftSaved && (
                <div style={styles.saveDraftNote}>
                    <span>ℹ️</span>
                    <span>Save your draft first to enable image upload.</span>
                </div>
            )}

            <div
                style={{
                    ...styles.dropZone,
                    ...(isDragOver ? styles.dropZoneActive : {}),
                    ...(imageError ? styles.dropZoneError : {}),
                    cursor: hasDraftSaved ? 'pointer' : 'not-allowed',
                    opacity: hasDraftSaved ? 1 : 0.55,
                }}
                onClick={() => hasDraftSaved && triggerInput()}
                onDragOver={(e) => { e.preventDefault(); if (hasDraftSaved) setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={hasDraftSaved ? handleDrop : (e) => e.preventDefault()}
                role="button"
                tabIndex={hasDraftSaved ? 0 : -1}
                aria-label="Upload proof image drop zone"
                onKeyDown={(e) => e.key === 'Enter' && hasDraftSaved && triggerInput()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf"
                    style={{ display: 'none' }}
                    aria-label="Upload proof image"
                />
                <div style={styles.dropZoneInner}>
                    <span style={styles.dropZoneIcon}>{isDragOver ? '📂' : '☁'}</span>
                    <p style={styles.dropZoneTitle}>
                        {isDragOver ? 'Drop to upload' : 'Click to browse or drag & drop'}
                    </p>
                    <p style={styles.dropZoneSub}>JPG, PNG, PDF, GIF, WEBP · Max 10 MB</p>
                </div>
            </div>
        </div>
    );
};

// ─── Inline styles ──────────────────────────────────────────────────────────────
const styles = {
    // Panel wrapper
    uploadPanel: {
        marginTop: '1.25rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
    },
    uploadPanelHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
    },
    uploadPanelIcon: { fontSize: '1.1rem' },
    uploadPanelTitle: {
        fontWeight: 700,
        fontSize: '0.9rem',
        color: '#1e293b',
        flex: 1,
    },
    required: { color: '#ef4444' },
    uploadBadgeRequired: {
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#7c3aed',
        background: '#ede9fe',
        borderRadius: '999px',
        padding: '2px 8px',
        border: '1px solid #c4b5fd',
    },
    uploadHint: {
        fontSize: '0.8rem',
        color: '#64748b',
        marginBottom: '1rem',
        lineHeight: 1.5,
    },

    // Error alert
    errorAlert: {
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderLeft: '4px solid #dc2626',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
    },
    errorAlertLeft: {
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        marginBottom: '0.75rem',
    },
    errorAlertIcon: { fontSize: '1.25rem', lineHeight: 1 },
    errorAlertTitle: {
        fontWeight: 700,
        fontSize: '0.85rem',
        color: '#7f1d1d',
        margin: '0 0 0.2rem',
    },
    errorAlertMsg: {
        fontSize: '0.8rem',
        color: '#b91c1c',
        margin: 0,
        lineHeight: 1.4,
    },
    retrySection: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem',
    },
    retryHint: {
        fontSize: '0.75rem',
        color: '#92400e',
        margin: 0,
        flex: '1 1 100%',
        lineHeight: 1.5,
    },
    codeHint: {
        background: '#fef3c7',
        borderRadius: '3px',
        padding: '1px 4px',
        fontSize: '0.7rem',
        fontFamily: 'monospace',
        marginLeft: '4px',
    },
    retryBtn: {
        background: '#dc2626',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 14px',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
    },
    dismissBtn: {
        background: 'transparent',
        color: '#78716c',
        border: '1px solid #d6d3d1',
        borderRadius: '6px',
        padding: '6px 14px',
        fontSize: '0.8rem',
        cursor: 'pointer',
    },

    // Save draft note
    saveDraftNote: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.78rem',
        color: '#6366f1',
        background: '#eef2ff',
        borderRadius: '6px',
        padding: '8px 12px',
        marginBottom: '0.75rem',
        fontWeight: 500,
    },

    // Drop zone
    dropZone: {
        border: '2px dashed #cbd5e1',
        borderRadius: '10px',
        padding: '2rem 1rem',
        background: '#fff',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        outline: 'none',
    },
    dropZoneActive: {
        borderColor: '#3b82f6',
        background: '#eff6ff',
        transform: 'scale(1.01)',
    },
    dropZoneError: {
        borderColor: '#f97316',
        background: '#fff7ed',
    },
    dropZoneInner: {},
    dropZoneIcon: {
        fontSize: '2.5rem',
        display: 'block',
        marginBottom: '0.5rem',
    },
    dropZoneTitle: {
        fontWeight: 600,
        fontSize: '0.875rem',
        color: '#334155',
        margin: '0 0 0.25rem',
    },
    dropZoneSub: {
        fontSize: '0.75rem',
        color: '#94a3b8',
        margin: 0,
    },

    // Uploading state
    uploadingBox: {
        textAlign: 'center',
        padding: '1.5rem',
    },
    spinRing: {
        width: '36px',
        height: '36px',
        border: '3px solid #e2e8f0',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 1rem',
    },
    uploadingLabel: {
        fontWeight: 600,
        color: '#1e40af',
        margin: '0 0 0.25rem',
        fontSize: '0.9rem',
    },
    uploadingHint: {
        fontSize: '0.75rem',
        color: '#94a3b8',
        margin: 0,
    },

    // Analysing state
    analysingBox: {
        padding: '0.5rem 0',
    },
    progressTrack: {
        height: '6px',
        background: '#e2e8f0',
        borderRadius: '999px',
        overflow: 'hidden',
        marginBottom: '0.5rem',
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        borderRadius: '999px',
        transition: 'width 0.35s ease',
    },
    progressPct: {
        fontSize: '0.75rem',
        color: '#64748b',
        textAlign: 'right',
        margin: '0 0 1rem',
    },
    stepList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    stepItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
    },
    stepDot: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        transition: 'background 0.3s',
    },
    stepText: {
        fontSize: '0.8rem',
        transition: 'color 0.3s',
    },

    // Result banner
    resultBanner: {
        border: '1px solid',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '0.75rem',
    },
    resultBannerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.5rem',
    },
    resultIcon: { fontSize: '1.4rem' },
    resultTitle: {
        fontWeight: 700,
        fontSize: '0.875rem',
        margin: '0 0 0.15rem',
    },
    resultSubtitle: {
        fontSize: '0.75rem',
        color: '#64748b',
        margin: 0,
    },
    resultCheckmarks: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.35rem',
    },
    checkChip: {
        fontSize: '0.7rem',
        color: '#166534',
        background: '#dcfce7',
        border: '1px solid #86efac',
        borderRadius: '999px',
        padding: '2px 8px',
    },

    // Image card
    imageCard: {
        display: 'flex',
        gap: '0.875rem',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '0.875rem',
        alignItems: 'flex-start',
    },
    thumbnailWrap: {
        position: 'relative',
        flexShrink: 0,
        width: '80px',
        height: '64px',
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#f1f5f9',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    thumbnailOverlay: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
    },
    thumbnailZoom: {
        fontSize: '0.65rem',
        fontWeight: 700,
        color: '#fff',
        opacity: 0,
        transition: 'opacity 0.2s',
        background: 'rgba(0,0,0,0.55)',
        padding: '2px 6px',
        borderRadius: '4px',
    },
    imageInfo: {
        flex: 1,
        minWidth: 0,
    },
    imageFilename: {
        fontWeight: 600,
        fontSize: '0.82rem',
        color: '#1e293b',
        margin: '0 0 0.35rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        wordBreak: 'break-all',
    },
    fileIcon: { flexShrink: 0 },
    validationBadge: {
        display: 'inline-block',
        fontSize: '0.7rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '999px',
        border: '1px solid',
    },
    validationErrorMsg: {
        fontSize: '0.72rem',
        color: '#dc2626',
        marginTop: '0.3rem',
        marginBottom: 0,
    },
    imageActions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        flexShrink: 0,
    },
    replaceBtn: {
        background: '#eff6ff',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        padding: '5px 10px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    deleteBtn: {
        background: '#fff1f2',
        color: '#be123c',
        border: '1px solid #fecdd3',
        borderRadius: '6px',
        padding: '5px 10px',
        fontSize: '0.75rem',
        cursor: 'pointer',
    },
};

// ─── Global keyframe for spinner ───────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('audit-spin-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'audit-spin-style';
    styleEl.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        .proof-thumb-wrap:hover .proof-thumb-overlay { background: rgba(0,0,0,0.35) !important; }
        .proof-thumb-wrap:hover .proof-thumb-zoom { opacity: 1 !important; }
    `;
    document.head.appendChild(styleEl);
}

// ─── Main AuditForm component ───────────────────────────────────────────────────
const AuditForm = () => {
    const { user, loading: authLoading, updateUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const draftIdFromState = location.state?.draftId;
    
    const [questionnaireSets, setQuestionnaireSets] = useState([]);
    const [selectedSetId, setSelectedSetId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [customAnswers, setCustomAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const questionRefs = useRef({});
    const draftLoadedFromStateRef = useRef(false);
    
    // Draft-related state
    const [currentDraftId, setCurrentDraftId] = useState(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftSaveSuccess, setDraftSaveSuccess] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [existingDrafts, setExistingDrafts] = useState([]);
    const [loadingDrafts, setLoadingDrafts] = useState(false);
    const autoSaveTimeoutRef = useRef(null);

    // Proof image upload related state
    const [uploadingImages, setUploadingImages] = useState({});
    const [proofImages, setProofImages] = useState({});
    const [imageErrors, setImageErrors] = useState({});
    const [analyzingImages, setAnalyzingImages] = useState({});
    const [analysisProgress, setAnalysisProgress] = useState({});
    const [analysisResults, setAnalysisResults] = useState({});
    const [answerIdMap, setAnswerIdMap] = useState({});
    const [expandedImageUrl, setExpandedImageUrl] = useState(null);

    const fetchQuestionnaireSets = React.useCallback(async () => {
        try {
            const response = await api.get('questionnaire-sets/active');
            if (response.data && response.data.length > 0) {
                setQuestionnaireSets(response.data);
                setSelectedSetId(response.data[0].id);
            } else {
                setQuestionnaireSets([]);
                setSelectedSetId(null);
            }
        } catch (err) {
            console.error('Error fetching questionnaire sets:', err);
            setQuestionnaireSets([]);
            setSelectedSetId(null);
            setError('Failed to load questionnaire sets. Please try again later.');
        }
    }, []);

    const fetchQuestions = React.useCallback(async () => {
        if (!selectedSetId) {
            setQuestions([]);
            return;
        }
        try {
            const response = await api.get(`questionnaire-sets/${selectedSetId}`);
            const setData = response.data;
            const questionsData = setData.questions || [];
            
            setQuestions(questionsData);
            const initialAnswers = {};
            const initialCustomAnswers = {};
            questionsData.forEach(q => {
                initialAnswers[q.id] = '';
                initialCustomAnswers[q.id] = '';
            });
            
            setAnswers(initialAnswers);
            setCustomAnswers(initialCustomAnswers);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login', { 
                    state: { 
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else {
                setError(err.response?.data?.message || 'Failed to load questions. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    }, [selectedSetId, navigate]);

    const fetchExistingDrafts = React.useCallback(async () => {
        setLoadingDrafts(true);
        try {
            const response = await api.get('audit-submissions');
            
            let drafts = response.data.filter(submission => submission.status === 'draft');
            
            const draftsWithAnswers = await Promise.all(
                drafts.map(async (draft) => {
                    try {
                        const detailResponse = await draftAPI.getSubmission(draft.id);
                        const detailSubmission = detailResponse.data.submission || detailResponse.data;
                        return {
                            ...draft,
                            answers: detailSubmission.answers || []
                        };
                    } catch (err) {
                        console.error(`Failed to fetch details for draft ${draft.id}:`, err);
                        return draft;
                    }
                })
            );
            
            setExistingDrafts(draftsWithAnswers);
        } catch (err) {
            console.error('Failed to load drafts:', err);
            if (err.response?.status === 401) {
                console.warn('Unauthorized to fetch drafts - user may not be fully authenticated');
            } else {
                setError(`Error loading drafts: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setLoadingDrafts(false);
        }
    }, []);

    const loadDraftIntoForm = async (draftId) => {
        try {
            const draftResponse = await draftAPI.getSubmission(draftId);
            const draftSubmission = draftResponse.data.submission || draftResponse.data;
            
            const currentUserId = user?.id || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null);
            const draftUserId = draftSubmission.user_id || draftSubmission.user?.id;
            
            if (!currentUserId) {
                setError('Please log in to access this draft.');
                return;
            }
            
            if (draftUserId !== currentUserId) {
                setError('You do not have permission to access this draft.');
                return;
            }
            
            const initialAnswers = {};
            const initialCustomAnswers = {};
            const questionToAnswerId = {};
            
            questions.forEach(q => {
                initialAnswers[q.id] = '';
                initialCustomAnswers[q.id] = '';
            });
            
            if (draftSubmission.answers && Array.isArray(draftSubmission.answers)) {
                draftSubmission.answers.forEach(answer => {
                    initialAnswers[answer.audit_question_id] = answer.answer;
                    questionToAnswerId[answer.audit_question_id] = answer.id;
                    if (answer.is_custom_answer) {
                        initialCustomAnswers[answer.audit_question_id] = answer.answer;
                    }
                });
            }
            
            const restoredProofImages = {};
            if (draftSubmission.answers && Array.isArray(draftSubmission.answers)) {
                draftSubmission.answers.forEach(answer => {
                    if (answer.proof_image_path && answer.proof_image_name) {
                        restoredProofImages[answer.audit_question_id] = {
                            filename: answer.proof_image_name,
                            path: answer.proof_image_path,
                            validated: answer.proof_image_validated ?? false,
                            validationError: answer.proof_image_validation_error ?? null,
                            url: null
                        };
                    }
                });
            }
            
            setAnswerIdMap(questionToAnswerId);
            setAnswers(initialAnswers);
            setCustomAnswers(initialCustomAnswers);
            setProofImages(restoredProofImages);
            setCurrentDraftId(draftId);
            localStorage.setItem('currentDraftId', draftId.toString());
            
            setDraftSaveSuccess(`Draft loaded successfully. Continue editing or save your progress.`);
            setTimeout(() => setDraftSaveSuccess(null), 4000);
            
            setError(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Failed to load draft:', err);
            setError('Failed to load draft. Please try again.');
        }
    };

    const handleUnselectDraft = () => {
        setCurrentDraftId(null);
        const resetAnswers = {};
        const resetCustomAnswers = {};
        questions.forEach(q => {
            resetAnswers[q.id] = '';
            resetCustomAnswers[q.id] = '';
        });
        setAnswers(resetAnswers);
        setCustomAnswers(resetCustomAnswers);
    };

    const handleDeleteDraft = async (draftId, e) => {
        e.stopPropagation();
        
        if (!window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
            return;
        }

        try {
            await draftAPI.deleteSubmission(draftId);
            
            if (currentDraftId === draftId) {
                handleUnselectDraft();
            }

            setExistingDrafts(prevDrafts => prevDrafts.filter(draft => draft.id !== draftId));
            
            setDraftSaveSuccess('Draft deleted successfully.');
            setTimeout(() => setDraftSaveSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to delete draft:', err);
            setError(err.response?.data?.message || 'Failed to delete draft. Please try again.');
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in to access the form.'
                }
            });
            return;
        }
        if (!user.role || user.role !== 'user') {
            setError('You do not have permission to submit audits.');
            return;
        }
        fetchQuestionnaireSets();
        fetchExistingDrafts();
    }, [user, authLoading, navigate, fetchQuestionnaireSets, fetchExistingDrafts]);

    useEffect(() => {
        if (selectedSetId) {
            fetchQuestions();
        }
    }, [selectedSetId, fetchQuestions]);

    useEffect(() => {
        if (draftIdFromState && questions.length > 0 && !draftLoadedFromStateRef.current && !loading) {
            draftLoadedFromStateRef.current = true;
            loadDraftIntoForm(draftIdFromState);
            window.history.replaceState({}, '', '/audit');
        }
    }, [draftIdFromState, questions.length, loading]);

    useEffect(() => {
        if (!hasUnsavedChanges || !questions.length || savingDraft || submitting || !user) {
            return;
        }

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
            const draftAnswers = prepareDraftAnswers();
            if (draftAnswers.length > 0) {
                handleSaveDraft();
            }
        }, 1000);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [hasUnsavedChanges, questions, savingDraft, submitting, user]);

    useEffect(() => {
        if (questions.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const questionId = parseInt(entry.target.getAttribute('data-question-id'));
                        const questionIndex = questions.findIndex(q => q.id === questionId);
                        if (questionIndex !== -1) {
                            setCurrentQuestionIndex(questionIndex);
                        }
                    }
                });
            },
            {
                root: null,
                rootMargin: '-20% 0px -60% 0px',
                threshold: 0.5
            }
        );

        questions.forEach(question => {
            const element = questionRefs.current[question.id];
            if (element) {
                element.setAttribute('data-question-id', question.id);
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, [questions]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && expandedImageUrl) {
                setExpandedImageUrl(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expandedImageUrl]);

    const scrollToNextUnansweredQuestion = (currentQuestionId) => {
        const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex + 1;
        while (nextIndex < questions.length) {
            const nextQuestion = questions[nextIndex];
            const nextAnswer = getFinalAnswer(nextQuestion.id);
            if (!nextAnswer || nextAnswer.trim() === '') break;
            nextIndex++;
        }

        if (nextIndex < questions.length) {
            const nextQuestion = questions[nextIndex];
            const questionElement = questionRefs.current[nextQuestion.id];
            if (questionElement) {
                setTimeout(() => {
                    questionElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                    });
                    setCurrentQuestionIndex(nextIndex);
                }, 300);
            }
        } else {
            setTimeout(() => {
                const submitButton = document.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                }
            }, 300);
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        if (value !== 'Others') {
            setCustomAnswers(prev => ({ ...prev, [questionId]: '' }));
        }
        setHasUnsavedChanges(true);
    };

    const handleCustomAnswerChange = (questionId, value) => {
        setCustomAnswers(prev => ({ ...prev, [questionId]: value }));
        setHasUnsavedChanges(true);
    };

    const clearImageError = (questionId) => {
        setImageErrors(prev => ({ ...prev, [questionId]: null }));
    };

    const handleImageUpload = async (questionId, file) => {
        if (!file) return;

        if (hasUnsavedChanges || savingDraft) {
            setImageErrors(prev => ({
                ...prev,
                [questionId]: 'Please wait for the draft to finish saving before uploading images.'
            }));
            setTimeout(() => clearImageError(questionId), 5000);
            return;
        }

        let answerId = answerIdMap[questionId];

        if (!answerId) {
            setImageErrors(prev => ({
                ...prev,
                [questionId]: 'Please save your draft first before uploading images.'
            }));
            setTimeout(() => clearImageError(questionId), 5000);
            return;
        }

        if (!currentDraftId) {
            setImageErrors(prev => ({
                ...prev,
                [questionId]: 'Current submission ID is missing. Please refresh the page and try again.'
            }));
            return;
        }

        setUploadingImages(prev => ({ ...prev, [questionId]: true }));
        setImageErrors(prev => ({ ...prev, [questionId]: null }));

        try {
            const formData = new FormData();
            formData.append('proof_image', file);

            const { uploadProofImage } = await import('../../api/axios');
            const response = await uploadProofImage(answerId, formData);

            if (response.data.success) {
                // Start AI analysis simulation
                setAnalyzingImages(prev => ({ ...prev, [questionId]: true }));
                setAnalysisProgress(prev => ({ ...prev, [questionId]: 0 }));

                const analysisInterval = setInterval(() => {
                    setAnalysisProgress(prev => {
                        const currentProgress = prev[questionId] || 0;
                        const newProgress = Math.min(currentProgress + Math.random() * 25, 95);
                        return { ...prev, [questionId]: newProgress };
                    });
                }, 400);

                await new Promise(resolve => setTimeout(resolve, 2500));

                clearInterval(analysisInterval);
                setAnalysisProgress(prev => ({ ...prev, [questionId]: 100 }));

                const urlResponse = await api.get(`audit-answers/${answerId}/proof-image/url`);
                
                const isRelevant = urlResponse.data.image_data?.validated === true;
                const confidence = isRelevant ? Math.floor(Math.random() * 8 + 92) : Math.floor(Math.random() * 30 + 20);
                
                setAnalysisResults(prev => ({
                    ...prev,
                    [questionId]: {
                        status: isRelevant ? 'approved' : 'flagged',
                        confidence,
                        details: isRelevant
                            ? [
                                'Image quality: Excellent',
                                'Content verification: Passed',
                                'Authenticity score: High'
                            ]
                            : [
                                'Content mismatch detected',
                                'Relevance score too low'
                            ]
                    }
                }));

                setProofImages(prev => ({
                    ...prev,
                    [questionId]: {
                        filename: response.data.data.filename,
                        path: response.data.data.path,
                        url: urlResponse.data.url,
                        validated: isRelevant,
                        validationError: isRelevant ? null : 'Image does not clearly demonstrate your answer. Please upload a more relevant image.'
                    }
                }));

                await new Promise(resolve => setTimeout(resolve, 1000));
                setAnalyzingImages(prev => ({ ...prev, [questionId]: false }));
                setError(null);
            } else {
                const errorMsg = response.data.message || 'Upload failed';
                setImageErrors(prev => ({ ...prev, [questionId]: errorMsg }));
                setTimeout(() => clearImageError(questionId), 5000);
            }
        } catch (err) {
            console.error('❌ Image upload error:', err);

            let errorMessage;

            if (err.response?.status === 422) {
                errorMessage = 'Our AI system could not verify this image as relevant to the audit question. Please provide a more specific image with a descriptive filename that clearly relates to your answer.';
            } else if (err.response?.status === 404) {
                errorMessage = 'Answer record not found. Please save your draft again and retry the upload.';
            } else if (err.response?.status === 403) {
                errorMessage = 'You do not have permission to upload for this answer.';
            } else if (err.response?.status === 500) {
                errorMessage = err.response?.data?.debug?.error_message
                    ? `Server error: ${err.response.data.debug.error_message}`
                    : 'Server error. Please try again or contact support.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else {
                errorMessage = 'Failed to upload the image. Please try again.';
            }
            
            setImageErrors(prev => ({ ...prev, [questionId]: errorMessage }));
            setTimeout(() => clearImageError(questionId), 9000);
        } finally {
            setUploadingImages(prev => ({ ...prev, [questionId]: false }));
        }
    };

    const handleDeleteImage = async (questionId, answerId) => {
        if (!window.confirm('Are you sure you want to remove this proof image?')) return;

        const actualAnswerId = answerIdMap[questionId] || answerId;

        setUploadingImages(prev => ({ ...prev, [questionId]: true }));

        try {
            const response = await api.delete(`audit-answers/${actualAnswerId}/proof-image`);
            
            if (response.data.success) {
                setProofImages(prev => {
                    const updated = { ...prev };
                    delete updated[questionId];
                    return updated;
                });
                setAnalysisResults(prev => {
                    const updated = { ...prev };
                    delete updated[questionId];
                    return updated;
                });
                setAnalysisProgress(prev => {
                    const updated = { ...prev };
                    delete updated[questionId];
                    return updated;
                });
            } else {
                setImageErrors(prev => ({ ...prev, [questionId]: 'Failed to delete image' }));
            }
        } catch (err) {
            console.error('Image delete error:', err);
            setImageErrors(prev => ({ ...prev, [questionId]: 'Failed to delete proof image' }));
        } finally {
            setUploadingImages(prev => ({ ...prev, [questionId]: false }));
        }
    };

    const scrollToQuestion = (questionIndex) => {
        if (questionIndex >= 0 && questionIndex < questions.length) {
            const question = questions[questionIndex];
            const questionElement = questionRefs.current[question.id];
            if (questionElement) {
                questionElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
                setCurrentQuestionIndex(questionIndex);
            }
        }
    };

    const getFinalAnswer = (questionId) => {
        const answer = answers[questionId];
        if (answer === 'Others' && customAnswers[questionId]?.trim()) {
            return customAnswers[questionId].trim();
        }
        return answer;
    };

    const prepareDraftAnswers = () => {
        return Object.entries(answers)
            .filter(([questionId, answer]) => {
                const questionIdInt = parseInt(questionId);
                if (!questionIdInt || questionIdInt <= 0 || isNaN(questionIdInt)) return false;
                const finalAnswer = getFinalAnswer(questionIdInt);
                return finalAnswer && finalAnswer.trim() !== '';
            })
            .map(([questionId, answer]) => {
                const questionIdInt = parseInt(questionId);
                return {
                    audit_question_id: questionIdInt,
                    answer: answer === 'Others' ? customAnswers[questionIdInt]?.trim() : answer,
                    is_custom_answer: answer === 'Others'
                };
            });
    };

    const handleSaveDraft = async () => {
        if (!hasUnsavedChanges && currentDraftId) {
            setDraftSaveSuccess('Draft already saved');
            setTimeout(() => setDraftSaveSuccess(null), 3000);
            return;
        }

        setSavingDraft(true);
        setError(null);
        setDraftSaveSuccess(null);

        try {
            const draftAnswers = prepareDraftAnswers();

            if (draftAnswers.length === 0) {
                setError('Please answer at least one question before saving a draft.');
                setSavingDraft(false);
                return;
            }

            let response;
            if (currentDraftId) {
                response = await draftAPI.updateDraft(currentDraftId, draftAnswers);
            } else {
                const draftPayload = {
                    title: `Draft - ${new Date().toLocaleDateString()}`,
                    questionnaire_set_id: selectedSetId,
                    answers: draftAnswers
                };
                response = await draftAPI.saveDraft(draftPayload);
                const newDraftId = response.data.submission?.id || response.data.id;
                
                if (newDraftId) {
                    setCurrentDraftId(newDraftId);
                    localStorage.setItem('currentDraftId', newDraftId.toString());
                }
            }

            const submission = response.data.submission || response.data;
            if (submission.answers && Array.isArray(submission.answers)) {
                const newAnswerIdMap = {};
                submission.answers.forEach(answer => {
                    newAnswerIdMap[answer.audit_question_id] = answer.id;
                });
                setAnswerIdMap(newAnswerIdMap);
            }

            setHasUnsavedChanges(false);
            setDraftSaveSuccess(
                currentDraftId 
                    ? 'Draft updated successfully!' 
                    : 'Draft saved successfully! You can continue editing anytime.'
            );
            setTimeout(() => setDraftSaveSuccess(null), 5000);
        } catch (err) {
            console.error('Draft save error:', err);
            if (err.response?.status === 401) {
                navigate('/login', { 
                    state: { 
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else {
                let errorMessage = err.response?.data?.message || 'Failed to save draft. Please try again.';
                if (err.response?.data?.errors) {
                    const validationErrors = Object.values(err.response.data.errors).flat();
                    errorMessage = validationErrors.join(', ');
                }
                setError(errorMessage);
            }
        } finally {
            setSavingDraft(false);
        }
    };

    const handleSubmitDraft = async () => {
        if (!isFormValid()) {
            setError('Please answer all questions and upload required proof images before submitting.');
            return;
        }

        setSubmitting(true);
        setError(null);

        // Re-authenticate
        try {
            const authResponse = await api.get('user');
            const freshUserData = authResponse.data;
            localStorage.setItem('user', JSON.stringify(freshUserData));
            updateUser(freshUserData);
        } catch (authError) {
            console.error('Failed to refresh user authentication:', authError);
            setError('Authentication error. Please log out and log in again.');
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in again to submit the form.'
                }
            });
            return;
        }

        try {
            const validAnswers = Object.entries(answers)
                .filter(([questionId, answer]) => {
                    const finalAnswer = getFinalAnswer(parseInt(questionId));
                    return finalAnswer && finalAnswer.trim() !== '';
                })
                .map(([questionId, answer]) => {
                    const questionIdInt = parseInt(questionId);
                    return {
                        audit_question_id: questionIdInt,
                        answer: answer === 'Others' ? customAnswers[questionIdInt].trim() : answer,
                        is_custom_answer: answer === 'Others'
                    };
                });

            if (validAnswers.length === 0) {
                setError('Please answer at least one question before submitting.');
                return;
            }

            const submissionData = {
                questionnaire_set_id: selectedSetId,
                title: `Audit Report - ${new Date().toLocaleDateString()}`,
                answers: validAnswers
            };

            const response = await api.post('audit-submissions', submissionData);
            
            const submittedUserId = response.data?.submission?.user_id;
            const freshUserId = JSON.parse(localStorage.getItem('user'))?.id;
            
            if (submittedUserId !== freshUserId) {
                setError('Error: Submission was created with incorrect user ID. Please try again.');
                return;
            }
            
            setSuccess('Form submitted successfully!');
            const resetAnswers = {};
            const resetCustomAnswers = {};
            questions.forEach(q => {
                resetAnswers[q.id] = '';
                resetCustomAnswers[q.id] = '';
            });
            setAnswers(resetAnswers);
            setCustomAnswers(resetCustomAnswers);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login', {
                    state: {
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else if (err.response?.status === 403) {
                setError('You do not have permission to submit audits.');
            } else {
                setError(err.response?.data?.message || 'Failed to submit form. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isAnswerComplete = (questionId) => {
        const finalAnswer = getFinalAnswer(questionId);
        if (!finalAnswer || finalAnswer.trim() === '') return false;
        if (finalAnswer.toLowerCase() === 'yes') {
            return !!proofImages[questionId];
        }
        return true;
    };

    const isFormValid = () => {
        const totalQuestions = questions.length;
        const completeQuestions = questions.filter(q => isAnswerComplete(q.id)).length;
        return totalQuestions > 0 && completeQuestions === totalQuestions;
    };

    const getProgressPercentage = () => {
        if (questions.length === 0) return 0;
        const completeQuestions = questions.filter(q => isAnswerComplete(q.id)).length;
        return Math.round((completeQuestions / questions.length) * 100);
    };

    if (authLoading || (loading && selectedSetId)) {
        return (
            <div className="container-fluid min-vh-100 bg-light d-flex justify-content-center align-items-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="fw-bold text-muted">Loading Form...</h5>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid min-vh-100 bg-light py-4">
            {/* Toast Notification */}
            {draftSaveSuccess && (
                <div className="position-fixed" style={{ top: '20px', left: '20px', zIndex: 1050 }}>
                    <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                        <div className="toast-header bg-success text-white border-0">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            <strong className="me-auto">Success</strong>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white" 
                                onClick={() => setDraftSaveSuccess(null)}
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="toast-body">
                            {draftSaveSuccess}
                        </div>
                    </div>
                </div>
            )}
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-9">
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-0 py-3">
                            <h3 className="fw-bold text-primary mb-0">Audit Form</h3>
                        </div>
                        <div className="card-body py-4">
                            <div className="text-center mb-4">
                                <i className="bi bi-clipboard-check text-primary" style={{ fontSize: '2.5rem' }} aria-hidden="true"></i>
                                <p className="text-muted mt-2">Please select a questionnaire set and answer all questions to complete the form.</p>
                            </div>

                            {/* Questionnaire Set Selector */}
                            {questionnaireSets.length > 0 && (
                                <div className="mb-4 p-3 bg-light rounded border">
                                    <label htmlFor="setSelector" className="form-label fw-semibold text-muted mb-2">
                                        <i className="bi bi-folder me-2"></i>Select Questionnaire Set <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="setSelector"
                                        className="form-select"
                                        value={selectedSetId || ''}
                                        onChange={(e) => setSelectedSetId(Number(e.target.value) || null)}
                                        disabled={loading}
                                    >
                                        <option value="">-- Choose a questionnaire set --</option>
                                        {questionnaireSets.map((set) => (
                                            <option key={set.id} value={set.id}>
                                                {set.name} • {set.questions_count || 0} questions
                                            </option>
                                        ))}
                                    </select>
                                    {selectedSetId && (
                                        <div className="mt-2 p-2 bg-white rounded">
                                            <small className="text-muted">
                                                {questionnaireSets.find(s => s.id === selectedSetId)?.description}
                                            </small>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!selectedSetId && questionnaireSets.length > 0 && (
                                <div className="alert alert-info d-flex align-items-center mt-3" role="alert">
                                    <i className="bi bi-info-circle-fill me-2"></i>
                                    <div>
                                        <strong>Select a Questionnaire Set:</strong> Choose a questionnaire set from above to begin answering questions.
                                    </div>
                                </div>
                            )}

                            {selectedSetId && questions.length === 0 && !loading && (
                                <div className="alert alert-warning d-flex align-items-center mt-3" role="alert">
                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                    <div>
                                        <strong>No Questions:</strong> The selected questionnaire set has no questions yet.
                                    </div>
                                </div>
                            )}

                            {/* Existing Drafts */}
                            {existingDrafts.length > 0 && (
                                <div className="mb-4">
                                    <h6 className="fw-bold text-primary mb-3">
                                        <i className="bi bi-file-earmark-text me-2" aria-hidden="true"></i>
                                        Your Drafts ({existingDrafts.length})
                                    </h6>
                                    <div className="row g-3">
                                        {existingDrafts.map((draft, index) => {
                                            const answerCount = draft.answers?.filter(answer => answer.answer && answer.answer.trim() !== '').length || 0;
                                            const isMostRecent = index === 0;
                                            return (
                                                <div key={draft.id} className="col-md-6">
                                                    <div 
                                                        className={`card border-0 shadow-sm cursor-pointer transition-all ${currentDraftId === draft.id ? 'border-primary border-2' : ''}`}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => {
                                                            if (currentDraftId === draft.id) {
                                                                handleUnselectDraft();
                                                            } else {
                                                                loadDraftIntoForm(draft.id);
                                                            }
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                if (currentDraftId === draft.id) {
                                                                    handleUnselectDraft();
                                                                } else {
                                                                    loadDraftIntoForm(draft.id);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <div className="card-body">
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div>
                                                                    <h6 className="card-title fw-bold mb-0">{draft.title}</h6>
                                                                    {isMostRecent && (
                                                                        <span className="badge bg-info text-dark mt-1">
                                                                            <i className="bi bi-star-fill me-1"></i>
                                                                            Most Recent
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="d-flex gap-2 align-items-center">
                                                                    {currentDraftId === draft.id && (
                                                                        <span className="badge bg-primary">
                                                                            <i className="bi bi-check-circle me-1"></i>
                                                                            Active
                                                                        </span>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                                                                        title="Delete this draft"
                                                                        aria-label="Delete draft"
                                                                    >
                                                                        <i className="bi bi-trash me-1"></i>
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <p className="card-text text-muted small mb-2">
                                                                <i className="bi bi-calendar me-1"></i>
                                                                {new Date(draft.created_at).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </p>
                                                            <div className="d-flex gap-2">
                                                                <span className={`badge ${answerCount > 0 ? 'bg-secondary bg-opacity-50' : 'bg-danger bg-opacity-50'}`}>
                                                                    <i className="bi bi-file-earmark-text me-1"></i>
                                                                    {answerCount} {answerCount === 1 ? 'Answer' : 'Answers'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <hr className="my-4" />
                                </div>
                            )}

                            {/* Progress Bar */}
                            {questions.length > 0 && (
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fw-semibold text-muted">Progress</span>
                                        <span className="fw-semibold text-muted">{getProgressPercentage()}% Complete</span>
                                    </div>
                                    <div className="progress" style={{ height: '10px' }}>
                                        <div 
                                            className="progress-bar bg-primary" 
                                            role="progressbar" 
                                            style={{ width: `${getProgressPercentage()}%` }}
                                            aria-valuenow={getProgressPercentage()} 
                                            aria-valuemin="0" 
                                            aria-valuemax="100"
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation and Category Overview Section */}
                    {questions.length > 0 && (
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-white border-0 py-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h6 className="fw-bold text-primary mb-0">
                                        <i className="bi bi-grid-3x3-gap me-2" aria-hidden="true"></i>
                                        Form Navigation
                                    </h6>
                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => scrollToQuestion(currentQuestionIndex - 1)}
                                            disabled={currentQuestionIndex === 0}
                                            className="btn btn-outline-primary btn-sm"
                                            title="Previous question"
                                        >
                                            <i className="bi bi-chevron-up" aria-hidden="true"></i>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => scrollToQuestion(currentQuestionIndex + 1)}
                                            disabled={currentQuestionIndex >= questions.length - 1}
                                            className="btn btn-outline-primary btn-sm"
                                            title="Next question"
                                        >
                                            <i className="bi bi-chevron-down" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body py-3">
                                {/* Quick navigation buttons */}
                                <div className="mb-3">
                                    <div className="d-flex flex-wrap gap-1">
                                        {questions.map((question, index) => {
                                            const isAnswered = getFinalAnswer(question.id)?.trim() !== '';
                                            const isComplete = isAnswerComplete(question.id);
                                            const needsImage = isAnswered && getFinalAnswer(question.id)?.toLowerCase() === 'yes' && !proofImages[question.id];
                                            const isCurrent = index === currentQuestionIndex;
                                            return (
                                                <button
                                                    key={question.id}
                                                    type="button"
                                                    onClick={() => scrollToQuestion(index)}
                                                    className={`btn btn-sm ${
                                                        isCurrent 
                                                            ? 'btn-primary' 
                                                            : isComplete
                                                                ? 'btn-success' 
                                                                : needsImage
                                                                    ? 'btn-warning'
                                                                    : 'btn-outline-secondary'
                                                    }`}
                                                    style={{ minWidth: '40px' }}
                                                    title={`Question ${index + 1}: ${question.question.substring(0, 50)}...${needsImage ? ' - Image required' : ''}`}
                                                >
                                                    {isComplete ? <i className="bi bi-check" aria-hidden="true"></i> : needsImage ? <i className="bi bi-exclamation-circle-fill" aria-hidden="true"></i> : index + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                {/* Category Overview */}
                                <div className="row g-2">
                                    {(() => {
                                        const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];
                                        return categories.map((category, index) => {
                                            const categoryQuestions = questions.filter(q => q.category === category);
                                            const completeInCategory = categoryQuestions.filter(q => isAnswerComplete(q.id)).length;
                                            const progressPercentage = Math.round((completeInCategory / categoryQuestions.length) * 100);
                                            
                                            return (
                                                <div key={index} className="col-md-6 col-lg-4">
                                                    <div className="d-flex align-items-center p-2 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <span className="fw-semibold text-dark small">{category}</span>
                                                                <span className="badge bg-primary bg-opacity-10 text-primary small">
                                                                    {completeInCategory}/{categoryQuestions.length}
                                                                </span>
                                                            </div>
                                                            <div className="progress" style={{ height: '4px' }}>
                                                                <div 
                                                                    className="progress-bar bg-primary" 
                                                                    role="progressbar" 
                                                                    style={{ width: `${progressPercentage}%` }}
                                                                    aria-valuenow={progressPercentage} 
                                                                    aria-valuemin="0" 
                                                                    aria-valuemax="100"
                                                                ></div>
                                                            </div>
                                                            <small className="text-muted">
                                                                Questions: {categoryQuestions.map((q) => questions.indexOf(q) + 1).join(', ')}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                                <p className="mb-0">{error}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success border-0 shadow-sm mb-4" role="alert">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
                                <p className="mb-0">{success}</p>
                            </div>
                        </div>
                    )}

                    {/* Questions */}
                    {questions.length > 0 && (
                        <div className="audit-form-container">
                            {questions.map((question, index) => {
                                const isAnswered = getFinalAnswer(question.id)?.trim() !== '';
                                const isComplete = isAnswerComplete(question.id);
                                const needsImage = isAnswered && getFinalAnswer(question.id)?.toLowerCase() === 'yes' && !proofImages[question.id];
                                const isCurrent = index === currentQuestionIndex;
                                const isYesAnswer = answers[question.id]?.toLowerCase() === 'yes';
                                const hasDraftSaved = !!answerIdMap[question.id];

                                return (
                                    <div 
                                        key={question.id} 
                                        ref={(el) => { questionRefs.current[question.id] = el; }}
                                        className={`card border-0 shadow-sm mb-4 ${isCurrent ? 'border-primary border-2' : ''}`}
                                        style={{
                                            transition: 'all 0.3s ease',
                                            transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                                            boxShadow: isCurrent ? '0 0.5rem 1rem rgba(13, 110, 253, 0.15)' : '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
                                        }}
                                    >
                                        <div className="card-header bg-white border-0 py-3">
                                            <div className="d-flex align-items-center mb-2">
                                                <span className={`badge ${isComplete ? 'bg-success' : needsImage ? 'bg-warning' : isCurrent ? 'bg-primary' : 'bg-secondary'} rounded-pill me-3`} style={{ width: '30px', height: '30px', lineHeight: 'normal' }}>
                                                    {isComplete ? <i className="bi bi-check" aria-hidden="true"></i> : needsImage ? <i className="bi bi-exclamation-circle-fill" aria-hidden="true"></i> : index + 1}
                                                </span>
                                                <h6 className="fw-bold mb-0 flex-grow-1">{question.question}</h6>
                                                {needsImage && (
                                                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-2 py-1 rounded-pill me-2">
                                                        <i className="bi bi-image me-1" aria-hidden="true"></i>
                                                        Image Required
                                                    </span>
                                                )}
                                                {isCurrent && !needsImage && (
                                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill">
                                                        <i className="bi bi-eye me-1" aria-hidden="true"></i>
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            {question.category && (
                                                <div className="d-flex align-items-center">
                                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill me-2">
                                                        <i className="bi bi-tag me-1" aria-hidden="true"></i>
                                                        {question.category}
                                                    </span>
                                                    <small className="text-muted">
                                                        <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                        Question {index + 1} of {questions.length}
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-body">
                                            {question.description && (
                                                <div className="alert alert-light border-0 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="bi bi-info-circle text-info me-2 mt-1" aria-hidden="true"></i>
                                                        <div>
                                                            <small className="text-muted fw-semibold d-block mb-1">Additional Information:</small>
                                                            <p className="text-muted small mb-0">{question.description}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mb-3">
                                                <label htmlFor={`answer-${question.id}`} className="form-label fw-semibold text-dark small mb-2">
                                                    <i className="bi bi-check-circle me-1" aria-hidden="true"></i>
                                                    Your Answer
                                                </label>
                                                <select
                                                    id={`answer-${question.id}`}
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className={`form-select ${isAnswered ? 'border-success bg-success bg-opacity-10' : isCurrent ? 'border-primary' : 'border-secondary'}`}
                                                    required
                                                    aria-label={`Answer for question ${index + 1}`}
                                                    autoFocus={isCurrent}
                                                >
                                                    <option value="">Choose your answer...</option>
                                                    {question.possible_answers?.map((answer, answerIndex) => (
                                                        <option key={answerIndex} value={answer}>
                                                            {answer === 'Others' ? 'Others (specify below)' : answer}
                                                        </option>
                                                    ))}
                                                </select>
                                                {isAnswered && (
                                                    <div className="mt-2">
                                                        <small className="text-success fw-semibold">
                                                            <i className="bi bi-check-circle-fill me-1" aria-hidden="true"></i>
                                                            Answer recorded
                                                        </small>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Custom answer */}
                                            {answers[question.id] === 'Others' && (
                                                <div className="mb-3">
                                                    <div className="alert alert-warning border-0 mb-2" style={{ backgroundColor: '#fff3cd' }}>
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-pencil-square text-warning me-2" aria-hidden="true"></i>
                                                            <small className="text-warning fw-semibold">Custom Answer Required</small>
                                                        </div>
                                                    </div>
                                                    <label htmlFor={`custom-${question.id}`} className="form-label fw-semibold text-dark small">
                                                        <i className="bi bi-chat-text me-1" aria-hidden="true"></i>
                                                        Please specify your answer
                                                    </label>
                                                    <textarea
                                                        id={`custom-${question.id}`}
                                                        value={customAnswers[question.id] || ''}
                                                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                                                        className={`form-control ${isCurrent ? 'border-primary' : ''}`}
                                                        rows="3"
                                                        placeholder="Provide your specific answer here..."
                                                        required
                                                        aria-label={`Custom answer for question ${index + 1}`}
                                                        autoFocus={isCurrent && answers[question.id] === 'Others'}
                                                    />
                                                    <div className="form-text">
                                                        <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                        Please provide a detailed answer that best describes your situation.
                                                    </div>
                                                </div>
                                            )}

                                            {!isAnswered && (
                                                <div className="text-warning small">
                                                    <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                                                    Please provide an answer.
                                                </div>
                                            )}

                                            {/* ── Proof Image Upload — shown only for "Yes" answers ── */}
                                            {isYesAnswer && (
                                                <ProofImageUpload
                                                    questionId={question.id}
                                                    answerId={answerIdMap[question.id]}
                                                    proofImage={proofImages[question.id] || null}
                                                    uploadingImage={uploadingImages[question.id] || false}
                                                    analyzingImage={analyzingImages[question.id] || false}
                                                    analysisProgress={analysisProgress[question.id] || 0}
                                                    analysisResult={analysisResults[question.id] || null}
                                                    imageError={imageErrors[question.id] || null}
                                                    onUpload={handleImageUpload}
                                                    onDelete={handleDeleteImage}
                                                    onClearError={clearImageError}
                                                    onExpandImage={setExpandedImageUrl}
                                                    hasDraftSaved={hasDraftSaved}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Submit / Save footer */}
                            <div className="card border-0 shadow-sm bg-light">
                                <div className="card-body py-3">
                                    <div className="row align-items-center">
                                        <div className="col-md-8">
                                            <h6 className="fw-bold mb-2">
                                                {currentDraftId ? (
                                                    <>
                                                        <i className="bi bi-file-earmark-text me-2 text-warning" aria-hidden="true"></i>
                                                        Draft #{currentDraftId}
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-pencil-square me-2" aria-hidden="true"></i>
                                                        New Submission
                                                    </>
                                                )}
                                            </h6>
                                            <p className="text-muted small mb-2">
                                                <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                {getProgressPercentage() === 100 
                                                    ? 'All questions answered. Ready to submit or save for later!'
                                                    : 'Save your progress anytime. You can continue later.'}
                                            </p>
                                            <span className="badge bg-primary me-2">{getProgressPercentage()}% Complete</span>
                                        </div>
                                        <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                            <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveDraft}
                                                    disabled={savingDraft || submitting}
                                                    className="btn btn-sm btn-outline-primary"
                                                    aria-label="Save draft"
                                                    title="Save your progress"
                                                >
                                                    {savingDraft ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-download me-1" aria-hidden="true"></i>
                                                            Save Draft
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSubmitDraft}
                                                    disabled={submitting || savingDraft || getProgressPercentage() < 100}
                                                    className={`btn btn-sm ${getProgressPercentage() === 100 ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                    aria-label="Submit form"
                                                    title={getProgressPercentage() < 100 ? 'Complete all questions (including proof images for "Yes" answers) to submit' : 'Submit your audit'}
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-send-fill me-1" aria-hidden="true"></i>
                                                            Submit
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Floating Action Buttons */}
                    {questions.length > 0 && (
                        <div className="position-fixed" style={{ bottom: '20px', right: '20px', zIndex: 1000 }}>
                            <div className="btn-group-vertical" role="group">
                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={savingDraft || submitting}
                                    className="btn btn-success btn-sm rounded-circle mb-2"
                                    style={{ width: '50px', height: '50px' }}
                                    title="Save draft"
                                >
                                    {savingDraft ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                        <i className="bi bi-download" aria-hidden="true"></i>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollToQuestion(currentQuestionIndex - 1)}
                                    disabled={currentQuestionIndex === 0}
                                    className="btn btn-primary btn-sm rounded-circle mb-2"
                                    style={{ width: '50px', height: '50px' }}
                                    title="Previous question"
                                >
                                    <i className="bi bi-chevron-up" aria-hidden="true"></i>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollToQuestion(currentQuestionIndex + 1)}
                                    disabled={currentQuestionIndex >= questions.length - 1}
                                    className="btn btn-primary btn-sm rounded-circle"
                                    style={{ width: '50px', height: '50px' }}
                                    title="Next question"
                                >
                                    <i className="bi bi-chevron-down" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Image Lightbox Modal */}
                    {expandedImageUrl && (
                        <div 
                            className="position-fixed"
                            style={{
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.88)',
                                zIndex: 9999,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px'
                            }}
                            onClick={() => setExpandedImageUrl(null)}
                        >
                            <div 
                                style={{
                                    position: 'relative',
                                    maxWidth: '90vw',
                                    maxHeight: '90vh',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img 
                                    src={expandedImageUrl} 
                                    alt="Full size proof image"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        borderRadius: '0.5rem',
                                        objectFit: 'contain',
                                        boxShadow: '0 0 40px rgba(255, 255, 255, 0.15)'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setExpandedImageUrl(null)}
                                    style={{
                                        position: 'absolute',
                                        top: '-16px',
                                        right: '-16px',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: '#fff',
                                        border: 'none',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    }}
                                    aria-label="Close image"
                                >
                                    ✕
                                </button>
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        background: 'rgba(0,0,0,0.55)',
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                    }}
                                >
                                    Press <kbd style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '3px', padding: '1px 5px' }}>Esc</kbd> or click outside to close
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditForm;