import 'regenerator-runtime/runtime';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from "@/components/ui/sonner"
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
  </StrictMode>,
)
