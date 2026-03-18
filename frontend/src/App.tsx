import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import Register from "@/pages/auth/Register"
import Login from "@/pages/auth/Login"
import ProtectedRoute from "@/components/ProtectedRoute"

import Home from "@/pages/Home"

import RecruiterDashboard from "@/pages/dashboard/RecruiterDashboard"
import CandidateDashboard from "@/pages/dashboard/CandidateDashboard"
import JobCandidates from "@/pages/dashboard/JobCandidates"
import InterviewReport from "@/pages/dashboard/InterviewReport"
import AdminDashboard from "@/pages/dashboard/AdminDashboard"
import ResumeReview from "@/pages/dashboard/ResumeReview"
import InterviewRoom from "@/pages/interview/InterviewRoom"

import CandidateResult from "@/pages/interview/CandidateResult"

// Placeholder components
const InterviewDetail = () => <div className="p-8 text-2xl">Interview Detail</div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes - Business */}
        <Route element={<ProtectedRoute allowedRoles={['business']} />}>
          <Route path="/dashboard" element={<RecruiterDashboard />} />
          <Route path="/jobs/:jobId/candidates" element={<JobCandidates />} />
          <Route path="/interview-report/:interviewId" element={<InterviewReport />} />
        </Route>

        {/* Protected Routes - Candidate */}
        <Route element={<ProtectedRoute allowedRoles={['candidate']} />}>
          <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
          <Route path="/resume-review" element={<ResumeReview />} />
          <Route path="/my-result/:id" element={<CandidateResult />} />
          <Route path="/interview/:id" element={<InterviewDetail />} />
          <Route path="/interview/:id/room" element={<InterviewRoom />} />
        </Route>

        {/* Protected Routes - Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
