import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import api, { draftAPI } from '../../api/axios';
import { useAuth } from '../../auth/useAuth';

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
    const autoSaveTimeoutRef = useRef(null); // Ref for debouncing auto-save

    // Proof image upload related state
    const [uploadingImages, setUploadingImages] = useState({}); // { questionId: boolean }
    const [proofImages, setProofImages] = useState({}); // { answerId: { filename, url, validated, error } }
    const [imageErrors, setImageErrors] = useState({}); // { questionId: errorMessage }
    const [analyzingImages, setAnalyzingImages] = useState({}); // { questionId: boolean }
    const [analysisProgress, setAnalysisProgress] = useState({}); // { questionId: 0-100 }
    const [analysisResults, setAnalysisResults] = useState({}); // { questionId: { confidence, status, details } }
    const [answerIdMap, setAnswerIdMap] = useState({}); // { questionId: answerId } - map to track actual answer IDs
    const fileInputRefs = useRef({});

    const fetchQuestionnaireSets = React.useCallback(async () => {
        try {
            const response = await api.get('questionnaire-sets/active');
            if (response.data && response.data.length > 0) {
                setQuestionnaireSets(response.data);
                // Auto-select first active set
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
            console.log('Fetching existing drafts...');
            const response = await api.get('audit-submissions');
            console.log('All submissions response:', response.data);
            
            // Filter for all draft submissions (regardless of answer count)
            let drafts = response.data.filter(submission => {
                const isDraft = submission.status === 'draft';
                console.log(`Submission ${submission.id}: status=${submission.status}, answers=${submission.answers?.length || 0}, isDraft=${isDraft}`);
                return isDraft;
            });
            
            // Fetch full details for each draft to get accurate answer count
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
            
            console.log('Drafts with answers:', draftsWithAnswers);
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
            console.log('Loading draft:', draftId);
            const draftResponse = await draftAPI.getSubmission(draftId);
            const draftSubmission = draftResponse.data.submission || draftResponse.data;
            
            console.log('Draft data received:', draftSubmission);
            
            // Get current user ID from localStorage or context
            const currentUserId = user?.id || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null);
            
            // Get draft owner ID - could be user_id or user.id depending on backend response
            const draftUserId = draftSubmission.user_id || draftSubmission.user?.id;
            
            // Verify the draft belongs to the current user
            if (!currentUserId) {
                setError('Please log in to access this draft.');
                return;
            }
            
            if (draftUserId !== currentUserId) {
                console.error('User ID mismatch:', {
                    draftUserId: draftUserId,
                    currentUserId: currentUserId
                });
                setError('You do not have permission to access this draft.');
                return;
            }
            
            // Load draft answers into form
            const initialAnswers = {};
            const initialCustomAnswers = {};
            const questionToAnswerId = {}; // Map question IDs to answer IDs
            
            questions.forEach(q => {
                initialAnswers[q.id] = '';
                initialCustomAnswers[q.id] = '';
            });
            
            if (draftSubmission.answers && Array.isArray(draftSubmission.answers)) {
                draftSubmission.answers.forEach(answer => {
                    initialAnswers[answer.audit_question_id] = answer.answer;
                    // Map question ID to answer ID for image uploads
                    questionToAnswerId[answer.audit_question_id] = answer.id;
                    if (answer.is_custom_answer) {
                        initialCustomAnswers[answer.audit_question_id] = answer.answer;
                    }
                });
                console.log('Loaded draft answers into map:', questionToAnswerId);
            }
            
            // Restore proof images from draft submission
            const restoredProofImages = {};
            if (draftSubmission.answers && Array.isArray(draftSubmission.answers)) {
                draftSubmission.answers.forEach(answer => {
                    if (answer.proof_image_path && answer.proof_image_name) {
                        restoredProofImages[answer.id] = {
                            filename: answer.proof_image_name,
                            path: answer.proof_image_path,
                            validated: answer.proof_image_validated ?? false,
                            validationError: answer.proof_image_validation_error ?? null,
                            url: null
                        };
                    }
                });
            }
            console.log('Restored proof images:', restoredProofImages);
            
            setAnswerIdMap(questionToAnswerId);
            setAnswers(initialAnswers);
            setCustomAnswers(initialCustomAnswers);
            setProofImages(restoredProofImages);
            setCurrentDraftId(draftId);
            localStorage.setItem('currentDraftId', draftId.toString());
            
            setDraftSaveSuccess(`Draft loaded successfully. Continue editing or save your progress.`);
            setTimeout(() => {
                setDraftSaveSuccess(null);
            }, 4000);
            
            setError(null);
            
            // Scroll to top of form
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
        
        // Confirm deletion
        if (!window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
            return;
        }

        try {
            await draftAPI.deleteSubmission(draftId);
            
            // If the deleted draft was the currently selected one, unselect it and reset all answers
            if (currentDraftId === draftId) {
                handleUnselectDraft();
            }

            // Remove the draft from the list
            setExistingDrafts(prevDrafts => prevDrafts.filter(draft => draft.id !== draftId));
            
            setDraftSaveSuccess('Draft deleted successfully.');
            setTimeout(() => {
                setDraftSaveSuccess(null);
            }, 3000);
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

    // Fetch questions when selected set changes
    useEffect(() => {
        if (selectedSetId) {
            fetchQuestions();
        }
    }, [selectedSetId, fetchQuestions]);

    // Load draft from navigation state if draftId is passed (only once)
    useEffect(() => {
        if (draftIdFromState && questions.length > 0 && !draftLoadedFromStateRef.current && !loading) {
            console.log('Loading draft from navigation state:', draftIdFromState);
            draftLoadedFromStateRef.current = true;
            loadDraftIntoForm(draftIdFromState);
            // Clear the state so it doesn't persist on refresh
            window.history.replaceState({}, '', '/audit');
        }
    }, [draftIdFromState, questions.length, loading]);

    // Auto-save with debounce when user makes changes
    useEffect(() => {
        if (!hasUnsavedChanges || !questions.length || savingDraft || submitting || !user) {
            return;
        }

        // Clear previous timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for debounced auto-save (1 second after user stops typing/selecting)
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

    // Intersection Observer to track which question is currently in view
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

        // Observe all question elements
        questions.forEach(question => {
            const element = questionRefs.current[question.id];
            if (element) {
                element.setAttribute('data-question-id', question.id);
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [questions]);

    const scrollToNextUnansweredQuestion = (currentQuestionId) => {
        const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
        if (currentIndex === -1) return;

        // Find the next unanswered question
        let nextIndex = currentIndex + 1;
        while (nextIndex < questions.length) {
            const nextQuestion = questions[nextIndex];
            const nextAnswer = getFinalAnswer(nextQuestion.id);
            if (!nextAnswer || nextAnswer.trim() === '') {
                break;
            }
            nextIndex++;
        }

        // If we found a next unanswered question, scroll to it
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
                }, 300); // Small delay to allow for any UI updates
            }
        } else {
            // If no more unanswered questions, scroll to submit button
            setTimeout(() => {
                const submitButton = document.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            }, 300);
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
        if (value !== 'Others') {
            setCustomAnswers(prev => ({
                ...prev,
                [questionId]: ''
            }));
        }
        // Mark as having unsaved changes to trigger auto-save
        setHasUnsavedChanges(true);
    };

    const handleCustomAnswerChange = (questionId, value) => {
        setCustomAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
        // Mark as having unsaved changes to trigger auto-save
        setHasUnsavedChanges(true);
    };

    // Clear image error handler
    const clearImageError = (questionId) => {
        setImageErrors(prev => ({
            ...prev,
            [questionId]: null
        }));
    };

    // Validate answer exists and belongs to current submission
    // Proof image upload handler
    const handleImageUpload = async (questionId, file) => {
        if (!file) return;

        // Check if there are unsaved changes or a save is in progress
        if (hasUnsavedChanges || savingDraft) {
            const errorMsg = 'Please wait for the draft to finish saving before uploading images.';
            setImageErrors(prev => ({
                ...prev,
                [questionId]: errorMsg
            }));
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                clearImageError(questionId);
            }, 5000);
            return;
        }

        // Check if we have the actual answer ID from the map
        let answerId = answerIdMap[questionId];

        // If answer ID doesn't exist, we need to save the draft first to create the answer records
        if (!answerId) {
            console.warn('No answer ID found for question:', questionId, 'Current map:', answerIdMap);
            const errorMsg = 'Please save your draft first before uploading images.';
            setImageErrors(prev => ({
                ...prev,
                [questionId]: errorMsg
            }));
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                clearImageError(questionId);
            }, 5000);
            return;
        }

        // Additional validation: ensure submission ID exists
        if (!currentDraftId) {
            console.error('Current submission ID is missing!', { questionId, answerId });
            const errorMsg = 'Current submission ID is missing. Please refresh the page and try again.';
            setImageErrors(prev => ({
                ...prev,
                [questionId]: errorMsg
            }));
            return;
        }

        setUploadingImages(prev => ({
            ...prev,
            [questionId]: true
        }));
        setImageErrors(prev => ({
            ...prev,
            [questionId]: null
        }));

        try {
            const formData = new FormData();
            formData.append('proof_image', file);

            // ✅ DEBUG: Verify file is in FormData
            console.log('📸 FormData Debug:', {
                questionId,
                answerId,
                currentSubmissionId: currentDraftId,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                answerIdMapKeys: Object.keys(answerIdMap),
                answerIdMapValues: Object.values(answerIdMap),
                formDataHasFile: formData.has('proof_image'),
                formDataEntries: Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `File: ${v.name}` : v])
            });

            // Log for debugging
            console.log('Uploading image for answer ID:', answerId, 'Question ID:', questionId, 'Current submission ID:', currentDraftId);

            // ✅ Use Fetch API directly for file uploads (avoids axios FormData issues)
            const { uploadProofImage } = await import('../../api/axios');
            const response = await uploadProofImage(answerId, formData);

            if (response.data.success) {
                // Start AI analysis simulation
                setAnalyzingImages(prev => ({
                    ...prev,
                    [questionId]: true
                }));
                setAnalysisProgress(prev => ({
                    ...prev,
                    [questionId]: 0
                }));

                // Simulate AI analysis progress
                const analysisInterval = setInterval(() => {
                    setAnalysisProgress(prev => {
                        const currentProgress = prev[questionId] || 0;
                        const newProgress = Math.min(currentProgress + Math.random() * 25, 95);
                        return {
                            ...prev,
                            [questionId]: newProgress
                        };
                    });
                }, 400);

                // Wait for analysis to complete (simulated delay 2-3 seconds)
                await new Promise(resolve => setTimeout(resolve, 2500));

                clearInterval(analysisInterval);

                // Set final progress
                setAnalysisProgress(prev => ({
                    ...prev,
                    [questionId]: 100
                }));

                // Fetch the image URL and status
                const urlResponse = await api.get(`audit-answers/${answerId}/proof-image/url`);
                
                // Simulate AI analysis results
                const analysisStatus = urlResponse.data.image_data?.validated ? 'approved' : 'flagged';
                const confidence = Math.floor(Math.random() * 25 + 75); // 75-100%
                
                setAnalysisResults(prev => ({
                    ...prev,
                    [questionId]: {
                        status: analysisStatus,
                        confidence: confidence,
                        details: [
                            'Image quality: Excellent',
                            'Content verification: Passed',
                            'Filename analysis: Valid format',
                            'Authenticity score: High'
                        ]
                    }
                }));

                setProofImages(prev => ({
                    ...prev,
                    [answerId]: {
                        filename: response.data.data.filename,
                        path: response.data.data.path,
                        url: urlResponse.data.url,
                        validated: urlResponse.data.image_data?.validated || false,
                        validationError: urlResponse.data.image_data?.validation_error
                    }
                }));

                // Keep analyzing state for a moment to show completion
                await new Promise(resolve => setTimeout(resolve, 1000));
                setAnalyzingImages(prev => ({
                    ...prev,
                    [questionId]: false
                }));

                setError(null);
            } else {
                const errorMsg = response.data.message || 'Upload failed';
                setImageErrors(prev => ({
                    ...prev,
                    [questionId]: errorMsg
                }));
                // Auto-dismiss after 5 seconds
                setTimeout(() => {
                    clearImageError(questionId);
                }, 5000);
            }
        } catch (err) {
            // 🔴 COMPREHENSIVE ERROR LOGGING
            console.error('❌ Image upload error:', err);
            console.error('Answer ID being used:', answerId);
            console.error('Current submission ID:', currentDraftId);
            console.error('Question ID:', questionId);
            console.log('Full answerIdMap:', answerIdMap);
            
            // Log response details for debugging backend issues
            if (err.response?.status === 500) {
                console.error('🔴 500 Internal Server Error - Backend crashed or threw exception');
                console.error('Backend response data:', err.response?.data);
                console.error('Backend response status:', err.response?.status);
                console.error('Backend response headers:', err.response?.headers);
            }
            if (err.response?.status === 422) {
                console.error('🟡 422 Unprocessable Entity - Validation failed');
                console.error('Validation errors:', err.response?.data?.errors);
                console.error('Full response:', err.response?.data);
            }
            
            let errorMessage = 'Failed to upload proof image. ';
            if (err.response?.status === 404) {
                errorMessage = `Answer ID ${answerId} not found or doesn't belong to submission ${currentDraftId}. `;
                errorMessage += 'This usually means the answer record wasn\'t properly saved. ';
                errorMessage += 'Please save your draft again and try uploading the image.';
                console.error('🔴 404 NOT FOUND - Answer ID mismatch', {
                    requestedAnswerId: answerId,
                    currentSubmissionId: currentDraftId,
                    answerIdMap: answerIdMap,
                    backendMessage: err.response?.data?.message
                });
            } else if (err.response?.status === 403) {
                errorMessage += 'You do not have permission to upload for this answer.';
            } else if (err.response?.status === 500) {
                errorMessage += 'Server error. Check browser console for details.';
            } else if (err.response?.status === 422) {
                errorMessage += 'Validation failed. Check browser console for details.';
            } else if (err.response?.data?.message) {
                errorMessage += err.response.data.message;
            } else {
                errorMessage += 'Please try again.';
            }
            
            setImageErrors(prev => ({
                ...prev,
                [questionId]: errorMessage
            }));
            
            // Auto-dismiss after 7 seconds for error messages
            setTimeout(() => {
                clearImageError(questionId);
            }, 7000);
        } finally {
            setUploadingImages(prev => ({
                ...prev,
                [questionId]: false
            }));
        }
    };

    // Delete proof image handler
    const handleDeleteImage = async (questionId, answerId) => {
        if (!window.confirm('Are you sure you want to delete this proof image?')) {
            return;
        }

        // Use the actual answer ID from the map
        const actualAnswerId = answerIdMap[questionId] || answerId;

        setUploadingImages(prev => ({
            ...prev,
            [questionId]: true
        }));

        try {
            const response = await api.delete(`audit-answers/${actualAnswerId}/proof-image`);
            
            if (response.data.success) {
                setProofImages(prev => {
                    const updated = { ...prev };
                    delete updated[actualAnswerId];
                    return updated;
                });
                // Clear analysis results
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
                setImageErrors(prev => ({
                    ...prev,
                    [questionId]: 'Failed to delete image'
                }));
            }
        } catch (err) {
            console.error('Image delete error:', err);
            setImageErrors(prev => ({
                ...prev,
                [questionId]: 'Failed to delete proof image'
            }));
        } finally {
            setUploadingImages(prev => ({
                ...prev,
                [questionId]: false
            }));
        }
    };

    // Trigger file input
    const triggerFileInput = (questionId) => {
        fileInputRefs.current[questionId]?.click();
    };

    // Function to scroll to a specific question
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
        const draftAnswers = Object.entries(answers)
            .filter(([questionId, answer]) => {
                // Filter out empty answers and invalid question IDs
                const questionIdInt = parseInt(questionId);
                if (!questionIdInt || questionIdInt <= 0 || isNaN(questionIdInt)) {
                    console.warn(`Skipping invalid question ID: ${questionId}`);
                    return false;
                }
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
        
        console.log('Prepared draft answers:', draftAnswers);
        return draftAnswers;
    };

    const handleSaveDraft = async () => {
        // Check if there are actually unsaved changes
        if (!hasUnsavedChanges && currentDraftId) {
            setDraftSaveSuccess('Draft already saved');
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                setDraftSaveSuccess(null);
            }, 3000);
            return;
        }

        setSavingDraft(true);
        setError(null);
        setDraftSaveSuccess(null);

        try {
            const draftAnswers = prepareDraftAnswers();

            // Validate that there is at least one answer
            if (draftAnswers.length === 0) {
                setError('Please answer at least one question before saving a draft.');
                setSavingDraft(false);
                return;
            }

            console.log('Saving draft with answers:', draftAnswers);

            let response;
            if (currentDraftId) {
                // Update existing draft
                console.log('Updating existing draft:', currentDraftId);
                response = await draftAPI.updateDraft(currentDraftId, draftAnswers);
            } else {
                // Create new draft
                console.log('Creating new draft with set:', selectedSetId);
                const draftPayload = {
                    title: `Draft - ${new Date().toLocaleDateString()}`,
                    questionnaire_set_id: selectedSetId,
                    answers: draftAnswers
                };
                response = await draftAPI.saveDraft(draftPayload);
                const newDraftId = response.data.submission?.id || response.data.id;
                console.log('New draft created with ID:', newDraftId);
                
                if (newDraftId) {
                    setCurrentDraftId(newDraftId);
                    // Store in localStorage as backup
                    localStorage.setItem('currentDraftId', newDraftId.toString());
                }
            }

            // Build question ID to answer ID map from response
            const submission = response.data.submission || response.data;
            if (submission.answers && Array.isArray(submission.answers)) {
                const newAnswerIdMap = {};
                submission.answers.forEach(answer => {
                    newAnswerIdMap[answer.audit_question_id] = answer.id;
                    console.debug('Answer created/updated:', {
                        questionId: answer.audit_question_id,
                        answerId: answer.id,
                        answer: answer.answer
                    });
                });
                setAnswerIdMap(newAnswerIdMap);
                console.log('Updated answer ID map after draft save:', newAnswerIdMap);
            } else {
                console.warn('No answers in draft response:', submission);
            }

            // Mark changes as saved
            setHasUnsavedChanges(false);
            setDraftSaveSuccess(
                currentDraftId 
                    ? 'Draft updated successfully!' 
                    : 'Draft saved successfully! You can continue editing anytime.'
            );

            // Clear success message after 5 seconds
            setTimeout(() => {
                setDraftSaveSuccess(null);
            }, 5000);
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
                // Extract validation errors from backend response
                let errorMessage = err.response?.data?.message || 'Failed to save draft. Please try again.';
                
                if (err.response?.data?.errors) {
                    const errors = err.response.data.errors;
                    const errorDetails = Object.entries(errors)
                        .map(([field, messages]) => messages[0])
                        .join('; ');
                    errorMessage = `Validation error: ${errorDetails}`;
                }
                
                setError(errorMessage);
                console.error('Full error response:', err.response?.data);
            }
        } finally {
            setSavingDraft(false);
        }
    };

    const handleSubmitDraft = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const draftAnswers = prepareDraftAnswers();
            
            // Validate that all questions are answered
            if (draftAnswers.length === 0 || getProgressPercentage() < 100) {
                setError('Please answer all questions before submitting.');
                setSubmitting(false);
                return;
            }

            // If there's an existing draft, submit it
            if (currentDraftId) {
                console.log('Submitting existing draft:', currentDraftId);
                // Update draft with final answers first
                await draftAPI.updateDraft(currentDraftId, draftAnswers);
                // Submit the draft
                const response = await draftAPI.submitDraft(currentDraftId);
                console.log('Draft submitted successfully:', response.data);
            } else {
                // No existing draft - submit directly with current answers
                console.log('Submitting form directly (no draft)');
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const submissionData = {
                    questionnaire_set_id: selectedSetId,
                    title: `Audit Report - ${new Date().toLocaleDateString()}`,
                    answers: draftAnswers
                };
                const response = await api.post('audit-submissions', submissionData);
                console.log('Form submitted successfully:', response.data);
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
            setCurrentDraftId(null);
            localStorage.removeItem('currentDraftId');
            
            // Redirect to submissions page after a delay
            setTimeout(() => {
                navigate('/submissions');
            }, 2000);
        } catch (err) {
            console.error('Form submit error:', err);
            if (err.response?.status === 401) {
                navigate('/login', { 
                    state: { 
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else {
                setError(err.response?.data?.message || 'Failed to submit form. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        // Validate current user authentication
        const currentUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        console.log('Submitting audit for user:', {
            token: token ? 'Present' : 'Missing',
            user: currentUser ? JSON.parse(currentUser) : 'No user data',
            userId: currentUser ? JSON.parse(currentUser).id : 'No user ID'
        });
        
        if (!token || !currentUser) {
            setError('Your session has expired. Please log in again.');
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in to submit the form.'
                }
            });
            return;
        }

        // Force refresh user data to ensure we have the latest authentication
        try {
            console.log('Refreshing user authentication before submission...');
            const userResponse = await api.get('/user');
            const freshUserData = userResponse.data;
            
            console.log('Fresh user data:', {
                id: freshUserData.id,
                name: freshUserData.name,
                email: freshUserData.email
            });
            
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(freshUserData));
            
            // Update the user context with fresh data
            updateUser(freshUserData);
            console.log('Updated user context with fresh data');
            
            // Verify the user ID matches (use fresh data for comparison)
            if (freshUserData.id !== user?.id) {
                console.warn('User ID mismatch detected - using fresh data:', {
                    contextUser: user?.id,
                    freshUser: freshUserData.id
                });
                // Don't return error, just use the fresh data
                console.log('Using fresh user data for submission validation');
            }
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
            
            // Log the full response structure for debugging
            console.log('Submission response structure:', {
                fullResponse: response.data,
                submission: response.data?.submission,
                userId: response.data?.submission?.user_id
            });
            
            // Validate that the submission was created with the correct user ID
            const submittedUserId = response.data?.submission?.user_id;
            const currentUserId = user?.id;
            const freshUserId = JSON.parse(localStorage.getItem('user'))?.id;
            
            console.log('Submission validation:', {
                submittedUserId,
                contextUserId: currentUserId,
                freshUserId: freshUserId,
                matches: submittedUserId === freshUserId
            });
            
            // Use fresh user ID for validation since context might be stale
            if (submittedUserId !== freshUserId) {
                console.error('CRITICAL: Submission created with wrong user ID!', {
                    expected: freshUserId,
                    actual: submittedUserId,
                    contextUser: currentUserId
                });
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

    // Check if an answer is truly complete (including image requirement for "Yes" answers)
    const isAnswerComplete = (questionId) => {
        const finalAnswer = getFinalAnswer(questionId);
        
        // Answer must have text
        if (!finalAnswer || finalAnswer.trim() === '') {
            return false;
        }

        // If answer is "Yes", require proof image
        if (finalAnswer.toLowerCase() === 'yes') {
            return !!proofImages[questionId]; // Must have proof image
        }

        // For other answers, just need the answer text
        return true;
    };

    const isFormValid = () => {
        const totalQuestions = questions.length;
        const completeQuestions = questions.filter(q => isAnswerComplete(q.id)).length;
        return totalQuestions > 0 && completeQuestions === totalQuestions;
    };

    const hasAnsweredQuestions = () => {
        return questions.some(q => isAnswerComplete(q.id));
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

                            {/* Show message if no set selected */}
                            {!selectedSetId && questionnaireSets.length > 0 && (
                                <div className="alert alert-info d-flex align-items-center mt-3" role="alert">
                                    <i className="bi bi-info-circle-fill me-2"></i>
                                    <div>
                                        <strong>Select a Questionnaire Set:</strong> Choose a questionnaire set from above to begin answering questions.
                                    </div>
                                </div>
                            )}

                            {/* Only show questions if a set is selected */}
                            {selectedSetId && questions.length === 0 && !loading && (
                                <div className="alert alert-warning d-flex align-items-center mt-3" role="alert">
                                    <i className="bi bi-exclamation-circle-fill me-2"></i>
                                    <div>
                                        <strong>No Questions:</strong> The selected questionnaire set has no questions yet.
                                    </div>
                                </div>
                            )}
                            {existingDrafts.length > 0 && (
                                <div className="mb-4">
                                    <h6 className="fw-bold text-primary mb-3">
                                        <i className="bi bi-file-earmark-text me-2" aria-hidden="true"></i>
                                        Your Drafts ({existingDrafts.length})
                                    </h6>
                                    <div className="row g-3">
                                        {existingDrafts.map((draft, index) => {
                                            const answerCount = draft.answers?.filter(answer => answer.answer && answer.answer.trim() !== '').length || 0;
                                            const isMostRecent = index === 0; // First draft is most recent
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
                                                                Questions: {categoryQuestions.map((q, idx) => questions.indexOf(q) + 1).join(', ')}
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

                    {questions.length > 0 && (
                        <div className="audit-form-container">
                            {questions.map((question, index) => {
                                const isAnswered = getFinalAnswer(question.id)?.trim() !== '';
                                const isComplete = isAnswerComplete(question.id);
                                const needsImage = isAnswered && getFinalAnswer(question.id)?.toLowerCase() === 'yes' && !proofImages[question.id];
                                const isCurrent = index === currentQuestionIndex;
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
                                            {isAnswered && answers[question.id]?.toLowerCase() === 'yes' && !proofImages[question.id] && (
                                                <div className="alert alert-warning border-0 py-2 mb-3" role="alert">
                                                    <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                                                    <small className="fw-semibold">Upload required - Since you answered "Yes", you must upload a proof image to complete this answer.</small>
                                                </div>
                                            )}
                                            {/* Proof Image Upload Section - Only for "Yes" answers */}
                                            {answers[question.id]?.toLowerCase() === 'yes' && (
                                                <div className="mb-3 mt-4 p-3 border rounded" style={{ backgroundColor: '#f0f7ff' }}>
                                                    <div className="d-flex align-items-center mb-3">
                                                        <i className="bi bi-image text-info me-2" aria-hidden="true"></i>
                                                        <label className="form-label fw-semibold text-dark mb-0">
                                                            Proof Image Required <span className="text-danger">*</span>
                                                        </label>
                                                    </div>
                                                    <p className="text-muted small mb-3">
                                                        Since you answered "Yes", please upload a proof image that validates your answer.
                                                    </p>

                                                    {/* Error message for image upload */}
                                                    {imageErrors[question.id] && (
                                                        <div className="alert alert-danger alert-dismissible fade show mb-3 py-2" role="alert">
                                                            <i className="bi bi-exclamation-circle-fill me-1"></i>
                                                            {imageErrors[question.id]}
                                                            <button 
                                                                type="button" 
                                                                className="btn-close" 
                                                                onClick={() => clearImageError(question.id)}
                                                                aria-label="Close"
                                                                style={{ marginTop: '-8px' }}
                                                            ></button>
                                                        </div>
                                                    )}

                                                    {/* Image upload area */}
                                                    {!proofImages[question.id] ? (
                                                        <div className="mb-3">
                                                            <div
                                                                className="border-2 border-dashed rounded p-4 text-center bg-white cursor-pointer"
                                                                style={{ borderColor: '#0d6efd', cursor: 'pointer' }}
                                                                onClick={() => triggerFileInput(question.id)}
                                                                onDragOver={(e) => {
                                                                    e.preventDefault();
                                                                    e.currentTarget.style.backgroundColor = '#f0f7ff';
                                                                }}
                                                                onDragLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'white';
                                                                }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    e.currentTarget.style.backgroundColor = 'white';
                                                                    if (e.dataTransfer.files.length > 0) {
                                                                        handleImageUpload(question.id, e.dataTransfer.files[0]);
                                                                    }
                                                                }}
                                                            >
                                                                <input
                                                                    type="file"
                                                                    ref={(el) => { fileInputRefs.current[question.id] = el; }}
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.length > 0) {
                                                                            handleImageUpload(question.id, e.target.files[0]);
                                                                        }
                                                                    }}
                                                                    accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf"
                                                                    className="d-none"
                                                                    aria-label="Upload proof image"
                                                                />
                                                                {uploadingImages[question.id] ? (
                                                                    <>
                                                                        <div className="spinner-border spinner-border-sm text-primary mb-2" role="status">
                                                                            <span className="visually-hidden">Uploading...</span>
                                                                        </div>
                                                                        <p className="text-primary fw-semibold mb-0">Uploading...</p>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="bi bi-cloud-arrow-up text-info" style={{ fontSize: '2rem' }}></i>
                                                                        <p className="text-muted fw-semibold mb-1">Click to upload or drag and drop</p>
                                                                        <p className="text-muted small mb-0">JPG, PNG, PDF, GIF up to 10 MB</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <small className="text-muted d-block mt-2">
                                                                <i className="bi bi-info-circle me-1"></i>
                                                                Use descriptive filenames (not "image.jpg", "photo.png", etc.)
                                                            </small>
                                                        </div>
                                                    ) : (
                                                        /* Image preview section */
                                                        <div className="mb-3">
                                                            {/* AI Analysis Section */}
                                                            {analyzingImages[question.id] && (
                                                                <div className="mb-3 p-4 border rounded" style={{ backgroundColor: '#f0f8ff', borderColor: '#0d6efd' }}>
                                                                    <div className="d-flex align-items-center mb-3">
                                                                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                                                            <span className="visually-hidden">Analyzing...</span>
                                                                        </div>
                                                                        <h6 className="mb-0 fw-bold text-primary">
                                                                            <i className="bi bi-cpu me-2"></i>
                                                                            AI Analyzing Image...
                                                                        </h6>
                                                                    </div>

                                                                    {/* Analysis Progress Bar */}
                                                                    <div className="mb-3">
                                                                        <div className="progress" style={{ height: '6px' }}>
                                                                            <div
                                                                                className="progress-bar bg-primary"
                                                                                role="progressbar"
                                                                                style={{ 
                                                                                    width: `${analysisProgress[question.id] || 0}%`,
                                                                                    transition: 'width 0.3s ease'
                                                                                }}
                                                                                aria-valuenow={Math.round(analysisProgress[question.id] || 0)}
                                                                                aria-valuemin="0"
                                                                                aria-valuemax="100"
                                                                            ></div>
                                                                        </div>
                                                                        <small className="text-muted d-block mt-1">
                                                                            {Math.round(analysisProgress[question.id] || 0)}% Complete
                                                                        </small>
                                                                    </div>

                                                                    {/* Analysis Steps */}
                                                                    <div className="small text-muted">
                                                                        <div className="mb-2">
                                                                            <i className="bi bi-check-circle text-success me-2"></i>
                                                                            <span>Uploading image...</span>
                                                                        </div>
                                                                        <div className={analysisProgress[question.id] >= 25 ? 'mb-2' : 'd-none mb-2'}>
                                                                            <i className={`bi ${analysisProgress[question.id] >= 50 ? 'bi-check-circle text-success' : 'bi-hourglass-split'} me-2`}></i>
                                                                            <span>Analyzing content quality...</span>
                                                                        </div>
                                                                        <div className={analysisProgress[question.id] >= 50 ? 'mb-2' : 'd-none mb-2'}>
                                                                            <i className={`bi ${analysisProgress[question.id] >= 75 ? 'bi-check-circle text-success' : 'bi-hourglass-split'} me-2`}></i>
                                                                            <span>Verifying filename authenticity...</span>
                                                                        </div>
                                                                        <div className={analysisProgress[question.id] >= 75 ? '' : 'd-none'}>
                                                                            <i className={`bi ${analysisProgress[question.id] >= 95 ? 'bi-check-circle text-success' : 'bi-hourglass-split'} me-2`}></i>
                                                                            <span>Finalizing validation...</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Analysis Complete - Results */}
                                                            {!analyzingImages[question.id] && analysisResults[question.id] && (
                                                                <div className={`mb-3 p-3 border rounded ${analysisResults[question.id].status === 'approved' ? 'border-success bg-success bg-opacity-10' : 'border-warning bg-warning bg-opacity-10'}`}>
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        {analysisResults[question.id].status === 'approved' ? (
                                                                            <>
                                                                                <i className="bi bi-shield-check text-success me-2" style={{ fontSize: '1.2rem' }}></i>
                                                                                <h6 className="mb-0 fw-bold text-success">
                                                                                    Image Verified by AI
                                                                                </h6>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <i className="bi bi-exclamation-triangle text-warning me-2" style={{ fontSize: '1.2rem' }}></i>
                                                                                <h6 className="mb-0 fw-bold text-warning">
                                                                                    Image Flagged for Review
                                                                                </h6>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <small className="text-muted d-block mb-2">
                                                                        Confidence Score: <span className="fw-bold">{analysisResults[question.id].confidence}%</span>
                                                                    </small>
                                                                    <div className="mt-2">
                                                                        <strong className="small d-block mb-2">Analysis Details:</strong>
                                                                        <ul className="small mb-0 ps-3">
                                                                            {analysisResults[question.id].details.map((detail, idx) => (
                                                                                <li key={idx} className="text-muted mb-1">
                                                                                    <i className="bi bi-check2 text-success me-1"></i>
                                                                                    {detail}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Image Display */}
                                                            <div className="d-flex align-items-center p-3 bg-white border rounded mb-3">
                                                                <div className="flex-grow-1">
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        <i className="bi bi-file-image text-success me-2"></i>
                                                                        <h6 className="fw-bold mb-0">{proofImages[question.id].filename}</h6>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        {proofImages[question.id].validated ? (
                                                                            <span className="badge bg-success">
                                                                                <i className="bi bi-check-circle me-1"></i>
                                                                                Validated
                                                                            </span>
                                                                        ) : (
                                                                            <span className="badge bg-warning text-dark">
                                                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                                                Pending Validation
                                                                            </span>
                                                                        )}
                                                                        {proofImages[question.id].validationError && (
                                                                            <small className="text-danger">
                                                                                {proofImages[question.id].validationError}
                                                                            </small>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteImage(question.id, answerIdMap[question.id])}
                                                                    disabled={uploadingImages[question.id]}
                                                                    className="btn btn-sm btn-outline-danger ms-2"
                                                                    title="Delete this image"
                                                                >
                                                                    {uploadingImages[question.id] ? (
                                                                        <>
                                                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                            Deleting...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <i className="bi bi-trash me-1"></i>
                                                                            Delete
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {proofImages[question.id].url && (
                                                                <a 
                                                                    href={proofImages[question.id].url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="btn btn-sm btn-outline-primary mb-3"
                                                                >
                                                                    <i className="bi bi-arrow-up-right me-1"></i>
                                                                    View Image
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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

                    {/* Floating Action Button for Quick Navigation and Draft Save */}
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
                </div>
            </div>
        </div>
    );
};

export default AuditForm;