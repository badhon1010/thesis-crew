# 🎓 ThesisCrew – Academic Research & Supervisor Collaboration Platform

ThesisCrew is a modern, full-stack web application designed to streamline the thesis and research management process for university students and faculty supervisors. It bridges the gap between students looking for research opportunities and professors posting research directions.

---

## ✨ Features

### 👨‍🎓 For Students
* **AI-Powered Recommendations:** Get personalized research topic suggestions and skill-match analysis powered by Google Gemini AI (`gemini-3.6-flash`).
* **Research Topic Discovery:** Browse, search, and filter published research topics. See real-time "Closing soon" and "Closed" tags for upcoming deadlines.
* **Interactive AI Chat:** A built-in AI assistant to help answer your research-related questions right from your dashboard.
* **Smart Profile Management:** Update personal academic details (CGPA, Student ID, Department) and manage technical skill tags.
* **Real-time Dashboard:** Track active projects, upcoming deadlines, pending requests, and recent activities with a highly interactive, animated UI.
* **Application Tracker:** Monitor the status of your research topic applications and form teams seamlessly.

### 👨‍🏫 For Supervisors (Teachers)
* **CRUD Operations on Topics:** Create, view, edit, and delete research topics effortlessly.
* **Draft & Publish System:** Save research topics as drafts or publish them instantly for students to view.
* **Advanced Research Group Management:** A dedicated workspace to manage enrolled teams, including:
  * **Milestones & Tasks:** Track research phases and assign tasks.
  * **Documents:** Centralized document repository for papers and datasets.
  * **Meetings:** Schedule and log meeting notes.
  * **Publications:** Track research outputs from draft to publication.

### ⚙️ General Features
* **Authentication:** Secure Firebase Authentication (Email/Password & Role-based access).
* **Real-time Notifications:** In-app notification bell system alerting users of application updates, tasks, and milestones.
* **Dark & Light Mode:** Fully optimized toggleable themes with custom dark slate aesthetics (`#0b0f19` / `#111622`).
* **Real-time Synchronization:** Powered by Google Cloud Firestore for instant data updates across all clients.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS, Vite, Lucide Icons
* **Backend / Database:** Firebase (Authentication, Cloud Firestore, Realtime Database)
* **AI Integration:** Google Gemini API (`@google/generative-ai`)
* **Routing:** React Router DOM

---

## 🚀 Getting Started Locally

Follow these steps to set up and run the project on your local machine:

### 1. Clone the Repository
```bash
git clone https://github.com/badhon1010/thesis-crew.git
cd thesis-crew
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Setup
Create a `.env` file in the root directory of your project and add your Firebase and Gemini API keys:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser to view the application.

---

## 🏗️ System Workflow & Architecture

The platform uses a modern, serverless architecture combining React, Firebase, and Google Gemini AI.

```mermaid
graph TD
    UI[Frontend (React)] -->|Auth State| Auth[Firebase Authentication]
    UI -->|Read/Write Data| FS[(Firestore Database)]
    UI -->|Real-time Alerts| Notif[Firestore Notifications]
    UI -->|Prompts & Data| AI[Gemini AI API]
    
    AI -->|Returns JSON| UI
```

### 🔄 User Journey & Workflows

1. **Authentication**: Users register as either a `student` or `teacher`. Data is saved to the `users` collection.
2. **Topic Creation**: Teachers create research topics. This saves to `researchTopics` and triggers notifications to all students.
3. **Matchmaking (AI)**: Students browse topics. Gemini AI calculates a `Match %` between the student's skills and the topic's required skills.
4. **Team Formation**: Students send a Join Request. Teachers accept it, which moves the project into the `researchGroups` collection.
5. **Collaboration**: Inside a group, students upload weekly tasks and research PDFs. Gemini extracts PDF metadata, and the system auto-generates APA/IEEE citations.
6. **Notifications**: Real-time alerts keep both students and teachers updated on tasks and join requests.

---

## 📂 Project Structure

```text
src/
├── components/          # Reusable UI components, Modals, AI Widgets
├── firebase/            # Firebase config, Firestore helpers, Notifications
├── lib/                 # Core utilities and AI integration (ai.ts)
├── pages/
│   ├── student/         # Student Dashboard, Topic Details, Group Details
│   └── teacher/         # Teacher Dashboard, Topic Management, Research Groups
├── routes/              # Application routing (AppRoutes.tsx)
├── index.css            # Global CSS and Tailwind directives
└── main.tsx             # Application entry point
```

---

## 👨‍💻 Author

**Team Zero**

Department of Computer Science and Engineering (CSE)

United International University, Dhaka, Bangladesh