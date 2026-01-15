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
    const [autosaveEnabled] = useState(true);
    const [lastAutoSave, setLastAutoSave] = useState(null);
    const [existingDrafts, setExistingDrafts] = useState([]);
    const [loadingDrafts, setLoadingDrafts] = useState(false);

    const fetchQuestions = React.useCallback(async () => {
        try {
            const response = await api.get('audit-questions');
            setQuestions(response.data);
            const initialAnswers = {};
            const initialCustomAnswers = {};
            response.data.forEach(q => {
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
    }, [navigate]);

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
            
            questions.forEach(q => {
                initialAnswers[q.id] = '';
                initialCustomAnswers[q.id] = '';
            });
            
            if (draftSubmission.answers && Array.isArray(draftSubmission.answers)) {
                draftSubmission.answers.forEach(answer => {
                    initialAnswers[answer.audit_question_id] = answer.answer;
                    if (answer.is_custom_answer) {
                        initialCustomAnswers[answer.audit_question_id] = answer.answer;
                    }
                });
            }
            
            setAnswers(initialAnswers);
            setCustomAnswers(initialCustomAnswers);
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
        fetchQuestions();
        fetchExistingDrafts();
    }, [user, authLoading, navigate, fetchQuestions, fetchExistingDrafts]);

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

    // Autosave effect - saves draft every 30 seconds if there are answers
    useEffect(() => {
        if (!autosaveEnabled || !questions.length || savingDraft || submitting || !user) {
            return;
        }

        const autosaveInterval = setInterval(() => {
            const draftAnswers = prepareDraftAnswers();
            
            // Only autosave if there are answers and enough time has passed since last save
            if (draftAnswers.length > 0) {
                const now = new Date();
                if (!lastAutoSave || (now - lastAutoSave) > 30000) { // 30 seconds
                    handleSaveDraft();
                }
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(autosaveInterval);
    }, [autosaveEnabled, questions, answers, customAnswers, savingDraft, submitting, user, lastAutoSave]);

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

        // Auto-scroll to next unanswered question after a short delay
        if (value && value.trim() !== '') {
            setTimeout(() => {
                scrollToNextUnansweredQuestion(questionId);
            }, 500);
        }
    };

    const handleCustomAnswerChange = (questionId, value) => {
        setCustomAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));

        // Auto-scroll to next unanswered question when custom answer is provided
        if (value && value.trim() !== '') {
            setTimeout(() => {
                scrollToNextUnansweredQuestion(questionId);
            }, 500);
        }
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
                console.log('Creating new draft');
                response = await draftAPI.saveDraft(draftAnswers);
                const newDraftId = response.data.submission?.id || response.data.id;
                console.log('New draft created with ID:', newDraftId);
                
                if (newDraftId) {
                    setCurrentDraftId(newDraftId);
                    // Store in localStorage as backup
                    localStorage.setItem('currentDraftId', newDraftId.toString());
                }
            }

            setLastAutoSave(new Date());
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
        if (!currentDraftId) {
            setError('Please save your draft first before submitting.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            // First, make sure all changes are saved
            const draftAnswers = prepareDraftAnswers();
            
            if (draftAnswers.length === 0) {
                setError('Please answer at least one question before submitting.');
                setSubmitting(false);
                return;
            }

            // Update draft with final answers if needed
            await draftAPI.updateDraft(currentDraftId, draftAnswers);

            // Now submit the draft
            console.log('Submitting draft:', currentDraftId);
            const response = await draftAPI.submitDraft(currentDraftId);
            console.log('Draft submitted successfully:', response.data);

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
            console.error('Draft submit error:', err);
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
                title: `Audit - ${new Date().toLocaleDateString()}`,
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

    const isFormValid = () => {
        const totalQuestions = questions.length;
        const answeredQuestions = Object.entries(answers).filter(([questionId, answer]) => {
            const finalAnswer = getFinalAnswer(parseInt(questionId));
            return finalAnswer && finalAnswer.trim() !== '';
        }).length;
        return totalQuestions > 0 && answeredQuestions === totalQuestions;
    };

    const hasAnsweredQuestions = () => {
        return Object.entries(answers).some(([questionId, answer]) => {
            const finalAnswer = getFinalAnswer(parseInt(questionId));
            return finalAnswer && finalAnswer.trim() !== '';
        });
    };

    const getProgressPercentage = () => {
        if (questions.length === 0) return 0;
        const answeredQuestions = Object.entries(answers).filter(([questionId, answer]) => {
            const finalAnswer = getFinalAnswer(parseInt(questionId));
            return finalAnswer && finalAnswer.trim() !== '';
        }).length;
        return Math.round((answeredQuestions / questions.length) * 100);
    };

    if (authLoading || loading) {
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
                                <p className="text-muted mt-2">Please answer all questions to complete the form.</p>
                            </div>

                            {/* Existing Drafts Section */}
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
                                            const isCurrent = index === currentQuestionIndex;
                                            return (
                                                <button
                                                    key={question.id}
                                                    type="button"
                                                    onClick={() => scrollToQuestion(index)}
                                                    className={`btn btn-sm ${
                                                        isCurrent 
                                                            ? 'btn-primary' 
                                                            : isAnswered 
                                                                ? 'btn-success' 
                                                                : 'btn-outline-secondary'
                                                    }`}
                                                    style={{ minWidth: '40px' }}
                                                    title={`Question ${index + 1}: ${question.question.substring(0, 50)}...`}
                                                >
                                                    {isAnswered ? <i className="bi bi-check" aria-hidden="true"></i> : index + 1}
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
                                            const answeredInCategory = categoryQuestions.filter(q => getFinalAnswer(q.id)?.trim() !== '').length;
                                            const progressPercentage = Math.round((answeredInCategory / categoryQuestions.length) * 100);
                                            
                                            return (
                                                <div key={index} className="col-md-6 col-lg-4">
                                                    <div className="d-flex align-items-center p-2 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <span className="fw-semibold text-dark small">{category}</span>
                                                                <span className="badge bg-primary bg-opacity-10 text-primary small">
                                                                    {answeredInCategory}/{categoryQuestions.length}
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
                                                <span className={`badge ${isAnswered ? 'bg-success' : isCurrent ? 'bg-primary' : 'bg-secondary'} rounded-pill me-3`} style={{ width: '30px', height: '30px', lineHeight: 'normal' }}>
                                                    {isAnswered ? <i className="bi bi-check" aria-hidden="true"></i> : index + 1}
                                                </span>
                                                <h6 className="fw-bold mb-0 flex-grow-1">{question.question}</h6>
                                                {isCurrent && (
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
                                                    ? 'All questions answered. Ready to submit!'
                                                    : 'Save your progress anytime. You can continue later.'}
                                            </p>
                                            <span className="badge bg-primary me-2">{getProgressPercentage()}% Complete</span>
                                        </div>
                                        <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                            <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveDraft}
                                                    disabled={savingDraft || submitting || !hasAnsweredQuestions()}
                                                    className={`btn btn-sm ${hasAnsweredQuestions() ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
                                                    aria-label="Save draft"
                                                    title={!hasAnsweredQuestions() ? 'Answer at least one question to save draft' : 'Save your progress'}
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
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-send-fill me-1" aria-hidden="true"></i>
                                                            {currentDraftId ? 'Submit Draft' : 'Submit Form'}
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
                                {hasAnsweredQuestions() && (
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
                                )}
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