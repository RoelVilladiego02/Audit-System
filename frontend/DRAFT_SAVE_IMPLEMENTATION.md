# Draft Save Functionality - Frontend Implementation

## Overview
Successfully implemented the draft save and submission functionality in the frontend to match the new backend endpoints for saving and submitting audit forms.

## Changes Made

### 1. **API Layer** (`src/api/axios.js`)
Added new `draftAPI` export with four methods:

- **`saveDraft(answers)`** - Creates a new draft submission with partial answers
  - Filters empty answers automatically
  - Returns submission with ID
  
- **`updateDraft(submissionId, answers)`** - Updates an existing draft
  - Adds or modifies answers
  - Only works with draft status submissions
  
- **`submitDraft(submissionId)`** - Converts a draft to submitted
  - Changes status from 'draft' to 'submitted'
  - Validates at least one answer exists
  
- **`getSubmission(submissionId)`** - Fetches a specific submission (for loading drafts)

### 2. **Audit Form Component** (`src/pages/User/AuditForm.jsx`)

#### New State Variables:
- `currentDraftId` - Tracks the current draft being edited
- `savingDraft` - Loading state for draft saves
- `draftSaveSuccess` - Success message from draft operations
- `autosaveEnabled` - Enables automatic saving (configurable)
- `lastAutoSave` - Timestamp of last autosave

#### New Features:

**Draft Loading:**
- Added URL parameter `draftId` support via `useSearchParams`
- Automatically loads draft data when navigating with `?draftId=123`
- Validates draft belongs to current user
- Pre-fills form with draft answers

**Auto-save Functionality:**
- Saves draft every 30 seconds automatically
- Only saves if there are answers and sufficient time has passed
- Non-blocking - doesn't interrupt user workflow
- Uses new `handleSaveDraft()` function

**Manual Save Button:**
- "Save Draft" button allows users to save at any time
- Shows save success message for 5 seconds
- Updates existing draft if already saved, creates new if not
- Disabled while submitting

**Submit Functionality:**
- "Submit Draft" button (only enabled when all questions answered)
- Validates all answers are present before submission
- Updates draft one final time before submitting
- Redirects to submissions page on success
- Changes button label based on draft status

#### Helper Functions:
- **`prepareDraftAnswers()`** - Converts form state to API format
- **`handleSaveDraft()`** - Saves or updates draft
- **`handleSubmitDraft()`** - Submits completed draft for review

### 3. **Submissions List Component** (`src/pages/User/SubmissionsList.jsx`)

#### Enhanced Status Display:
- Added 'draft' status badge styling (secondary, semi-transparent)
- Added file icon for draft status
- Updated status text display to show draft status

#### Draft Actions:
- Draft submissions show "Continue" button instead of view button
- "Continue" button links to `/audit-form?draftId={id}`
- Clicking continue loads draft in edit mode
- Non-draft submissions still show regular view button

#### Updated Badge Functions:
- `getStatusBadge()` - Added draft status styling
- `getStatusIcon()` - Added draft file icon

## User Workflow

### Create a New Draft:
1. User navigates to `/audit-form`
2. Answers some questions
3. Clicks "Save Draft" button
4. System creates draft submission and saves draft ID
5. User can now continue editing or leave

### Continue from Draft:
1. User sees draft in submissions list with "Continue" button
2. Clicks "Continue" button
3. Form loads with all previous answers pre-filled
4. User can modify answers and save changes
5. Auto-save preserves changes every 30 seconds

### Submit Draft:
1. User answers all remaining questions
2. "Submit Draft" button becomes enabled
3. User clicks "Submit Draft"
4. System submits for admin review
5. User redirected to submissions list
6. Submission status changes from 'draft' to 'submitted'

## Technical Details

### Data Flow:
```
User Input → State Update → Auto-save (30s) or Manual Click
                                    ↓
                            prepareDraftAnswers()
                                    ↓
                            draftAPI.saveDraft/updateDraft
                                    ↓
                            Backend API Call
                                    ↓
                            Success Message & Update UI
```

### Status Codes & Error Handling:
- **401 Unauthorized** - Redirects to login
- **403 Forbidden** - Shows permission error
- **400/422 Validation Errors** - Shows specific error message
- **Network Errors** - Shows generic error with retry option

### Security:
- Draft ownership validation (can only load own drafts)
- User ID verification before operations
- Token-based authentication maintained
- CSRF protection through axios configuration

## API Endpoints Used

```
POST   /api/audit-submissions/save-draft        → Create new draft
PATCH  /api/audit-submissions/{id}/draft        → Update draft
PATCH  /api/audit-submissions/{id}/submit       → Submit draft
GET    /api/audit-submissions/{id}              → Load draft data
GET    /audit-questions                         → Load questions
GET    /audit-submissions                       → List submissions
```

## Browser Features Used
- `useSearchParams` - For draft ID parameter
- `localStorage` - For token/user storage
- `setInterval` - For auto-save mechanism
- `IntersectionObserver` - For question tracking (existing)

## Future Enhancements

1. **Conflict Detection** - Warn if draft was edited elsewhere
2. **Offline Saving** - Save to localStorage, sync when online
3. **Draft Expiration** - Auto-delete drafts older than 30 days
4. **Collaborative Drafts** - Multiple users edit same draft
5. **Export Draft** - Download draft as PDF
6. **Draft History** - View previous versions of draft

## Testing Checklist

- [ ] Create new draft from form
- [ ] Auto-save saves draft at 30-second intervals
- [ ] Manual save updates existing draft
- [ ] Load draft from submissions list
- [ ] Draft answers pre-fill correctly
- [ ] Modify draft and save changes
- [ ] Submit completed draft
- [ ] Draft status changes to submitted
- [ ] Redirect to submissions on submit
- [ ] Error handling for 401/403/validation errors
- [ ] Draft ownership validation

## Notes

- Auto-save interval is set to 30 seconds (configurable via `autosaveEnabled` state)
- Success messages auto-dismiss after 5 seconds
- Form uses type="button" for save/submit buttons (not form submission)
- Draft submission validates at least one answer exists
- All user authentication is validated before operations
