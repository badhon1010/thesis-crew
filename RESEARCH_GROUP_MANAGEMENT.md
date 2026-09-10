# Research Group Management System

## Overview
A comprehensive research group management page has been created to help teachers manage their research teams from project inception through to publication. This replaces the generic topic details page when accessing full-capacity research groups.

## Navigation Changes
- **Before**: Clicking on a research group from `/teacher/research-groups` opened the generic topic details page
- **After**: Now opens a dedicated research group management environment at `/teacher/research-groups/:id`

## Features

### 1. Overview Tab
- **Team Statistics Dashboard**
  - Team size tracking
  - Overall progress percentage (based on completed milestones)
  - Task completion stats
  - Publication count
- **Research Description**: Full project description display
- **Team Members Grid**: Visual display of all team members with profile access
- **Recent Activity Panels**:
  - Upcoming milestones (next 3)
  - Recently added documents

### 2. Milestones Tab
Research phase tracking with status indicators:
- **Status Types**: Pending, In Progress, Completed
- **Information Tracked**:
  - Title and description
  - Deadline dates
  - Current status
- **Actions**: Add, edit, delete milestones
- **Visual Indicators**: Color-coded status icons

### 3. Tasks Tab
Detailed task management system:
- **Task Categories**: To Do, In Progress, Completed
- **Priority Levels**: Low, Medium, High (color-coded)
- **Task Information**:
  - Title and description
  - Assigned team members
  - Due dates
  - Priority level
- **Statistics Dashboard**: Quick overview of task distribution
- **Interactive Checkboxes**: Visual task completion tracking

### 4. Documents Tab
Centralized document repository:
- **Document Types**: Papers, Datasets, Code, Presentations, Other
- **Information Tracked**:
  - Document title
  - Type (with color-coded icons)
  - Upload timestamp
  - Uploader name
  - External URL/link
- **Features**: Upload, view, and delete documents

### 5. Meetings Tab
Meeting and collaboration tracking:
- **Meeting Information**:
  - Title and agenda
  - Date and time
  - Duration
  - Attendees list
  - Meeting notes
- **Actions**: Schedule, edit, and delete meetings
- **Chronological View**: Sorted by most recent first

### 6. Publications Tab
Track research outputs and submissions:
- **Publication Types**: Conference, Journal, Workshop, Preprint
- **Status Tracking**:
  - Draft
  - Submitted
  - Under Review
  - Accepted
  - Published
  - Rejected
- **Information Tracked**:
  - Title and venue
  - Submission/acceptance/publication dates
  - DOI (if published)
  - Current status with color-coded badges

## Real-World Research Management Features

The system is designed based on typical academic research workflows:

1. **Planning Phase**: Set milestones and create initial task breakdown
2. **Execution Phase**: Track tasks, manage documents, hold meetings
3. **Writing Phase**: Track paper drafts and collaboration
4. **Submission Phase**: Monitor publication submissions and reviews
5. **Publication Phase**: Record accepted papers and DOIs

## Data Structure

The system uses Firestore subcollections under each research group:
- `researchGroups/{groupId}/milestones`
- `researchGroups/{groupId}/tasks`
- `researchGroups/{groupId}/documents`
- `researchGroups/{groupId}/meetings`
- `researchGroups/{groupId}/publications`

All data is real-time synchronized using Firestore's `onSnapshot` listeners.

## User Experience

- **Tab-based Navigation**: Easy switching between different management aspects
- **Real-time Updates**: All changes sync instantly across sessions
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Full dark/light theme compatibility
- **Empty States**: Helpful guidance when sections are empty
- **Action Buttons**: Clear call-to-action buttons for adding new items

## Next Steps for Full Implementation

To make the buttons functional, you'll need to implement:

1. **Modal Components**: Create forms for adding/editing items
2. **Firestore Operations**: Implement CRUD operations for each data type
3. **Permissions**: Add role-based access (teacher can manage, students can view/contribute)
4. **File Upload**: Integrate file storage for document uploads
5. **Notifications**: Alert team members of new tasks/meetings
6. **Calendar Integration**: Optional integration with external calendars
7. **Export Features**: Generate reports, export data
8. **Search & Filters**: Search within documents, tasks, etc.

## Routes Updated

- Added route: `/teacher/research-groups/:id` → `ResearchGroupManagement`
- Updated navigation in: `TeacherResearchGroups.tsx` to use new route
- Import added to: `AppRoutes.tsx`

The foundation is now in place for a complete research group management system!
