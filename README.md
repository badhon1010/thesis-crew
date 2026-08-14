Markdown
# 🎓 ThesisCrew – Academic Research & Supervisor Collaboration Platform

ThesisCrew is a modern, full-stack web application designed to streamline the thesis and research management process for university students and faculty supervisors. It bridges the gap between students looking for research opportunities and professors posting research directions.

---

## ✨ Features

### 👨‍🎓 For Students
* **Research Topic Discovery:** Browse and search through published research topics with skill-tag filtering.
* **Smart Profile Management:** Update personal academic details (CGPA, Student ID, Department) and manage technical skill tags.
* **Real-time Dashboard:** Track active projects, upcoming deadlines, pending requests, and recent activities with a live clock.
* **Application Tracker:** Monitor the status of your research topic applications.

### 👨‍🏫 For Supervisors (Teachers)
* **CRUD Operations on Topics:** Create, view, edit, and delete research topics seamlessly.
* **Draft & Publish System:** Save research topics as drafts or publish them instantly for students to view.
* **Supervisor Workspace:** Monitor enrolled teams, pending student requests, and completed projects.

### ⚙️ General Features
* **Authentication:** Secure Firebase Authentication (Email/Password & Role-based access).
* **Dark & Light Mode:** Fully optimized toggleable themes with custom dark slate aesthetics (`#0b0f19` / `#111622`).
* **Real-time Synchronization:** Powered by Google Cloud Firestore for instant data updates.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Tailwind CSS, Vite, Lucide Icons
* **Backend / Database:** Firebase Authentication, Cloud Firestore
* **Routing:** React Router DOM

---

## 🚀 Getting Started Locally

Follow these steps to set up and run the project on your local machine:

### 1. Clone the Repository
```bash
git clone [https://github.com/badhon1010/thesis-crew.git]
cd thesis-crew
2. Install Dependencies
Bash
npm install
3. Environment Variables Setup
Create a .env file in the root directory of your project and add your Firebase configuration details:

Code snippet
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
4. Run the Development Server
Bash
npm run dev
Open http://localhost:5173 in your browser to view the application.

📂 Project Structure
Plaintext
src/
├── components/          # Reusable UI components (Layouts, Sidebar, ThemeToggle)
├── firebase/            # Firebase configuration and Firestore helper functions
├── pages/
│   ├── student/         # Student Dashboard, Research Topics, Profile, Applications
│   └── teacher/         # Teacher Dashboard, Create Topic, Edit Topic
├── routes/              # Application routing configuration (AppRoutes.tsx)
├── index.css            # Global CSS and Tailwind configurations
└── main.tsx             # Application entry point

👨‍💻 Author
Badhon Saha

Department of Computer Science and Engineering (CSE)

GitHub: @badhon1010