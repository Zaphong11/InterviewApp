import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import Register from "@/pages/auth/Register"
import Login from "@/pages/auth/Login"
import ProtectedRoute from "@/components/ProtectedRoute"

function Home() {
  const { user, isAuthenticated, login, logout } = useAuth()

  const handleLogin = () => {
    // Mock login
    login("mock-token")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-8">Vite + React + Tailwind + Shadcn</h1>

      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Auth Status</h2>
        <p>Is Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
        {user && <p>User: {user.full_name} ({user.email})</p>}
        <div className="mt-4">
          {isAuthenticated ? (
            <Button onClick={logout} variant="destructive">Logout</Button>
          ) : (
            <Button onClick={handleLogin}>Login (Mock)</Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Button>Default Button</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  )
}

import RecruiterDashboard from "@/pages/dashboard/RecruiterDashboard"

import InterviewRoom from "@/pages/interview/InterviewRoom"

// Placeholder components
const MyInterviews = () => <div className="p-8 text-2xl">Candidate Interviews</div>
const InterviewDetail = () => <div className="p-8 text-2xl">Interview Detail</div>
const AdminPanel = () => <div className="p-8 text-2xl">Admin Panel</div>

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
        </Route>

        {/* Protected Routes - Candidate */}
        <Route element={<ProtectedRoute allowedRoles={['candidate']} />}>
          <Route path="/my-interviews" element={<MyInterviews />} />
          <Route path="/interview/:id" element={<InterviewDetail />} />
          <Route path="/interview/:id/room" element={<InterviewRoom />} />
        </Route>

        {/* Protected Routes - Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
