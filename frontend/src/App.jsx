import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth, API_BASE_URL } from './contexts/AuthContext'
import Sidebar from './components/Sidebar'
import ChatHistory from './components/ChatHistory'
import ChatWindow from './components/ChatWindow'
import RoadmapView from './components/Roadmap'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './components/AdminDashboard'
import LessonsPage from './pages/LessonsPage'
import LabRunnerPage from './pages/LabRunnerPage'
import LessonModal from './components/LessonModal'
import LabWorkspace from './components/LabWorkspace'
import QuizModal from './components/QuizModal'
import ProfilePage from './pages/ProfilePage'
import RoleBadge from './components/RoleBadge'
import { lessonsData } from './data/lessonsData'
import './index.css'
import axios from 'axios'
import { Shield, MessageSquare, Sparkles, Loader2, Lock } from 'lucide-react'

function PlatformHeader({ user }) {
  return (
    <div className="h-14 border-b border-slate-900 bg-gradient-to-r from-slate-950 via-[#0b0e14] to-slate-950 px-6 flex items-center justify-between text-xs select-none z-30 relative backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 shadow-sm shadow-amber-500/5">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
        </div>
        <span className="font-bold text-slate-100 font-display text-sm tracking-wide flex items-center gap-1.5">
          BLOCKCHAIN SEC <span className="text-amber-500 font-mono text-[10px] bg-amber-550/10 px-2 py-0.5 rounded border border-amber-500/20">AI ACADEMY</span>
        </span>
      </div>
      
      <div className="flex items-center gap-4 font-mono text-[10px] text-slate-400">
        {/* Role Badge */}
        {user && (
          <RoleBadge role={user.role} />
        )}
      </div>
    </div>
  )
}

function MainContent() {
  const { user, isAuthenticated, isGuest, isAdmin, loading, logout, role } = useAuth()
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('lessons') // 'roadmap' | 'lessons' | 'lab' | 'chat' | 'admin'
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [refreshHistory, setRefreshHistory] = useState(0)
  const [refreshProgress, setRefreshProgress] = useState(0)
  
  const [activeLessonModal, setActiveLessonModal] = useState(null)
  const [activeLab, setActiveLab] = useState(null)
  const [activeQuizModal, setActiveQuizModal] = useState(null)
  const [lessons, setLessons] = useState(lessonsData)

  // Fetch lessons from database / api
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await axios.get(`${API_BASE_URL}/roadmap/beginner`, { headers })
        const dbLessons = (res.data.lessons || []).map(l => ({
          ...l,
          id: l.id ? l.id.replace('_', '-') : l.id
        }))
        if (dbLessons.length > 0) {
          setLessons(dbLessons)
        }
      } catch (err) {
        console.error('Error fetching lessons in App:', err)
      }
    }
    fetchLessons()
  }, [refreshProgress])

  // Safety check and reset when user changes
  useEffect(() => {
    if (activeTab === 'admin' && (!user || user.role !== 'admin')) {
      setActiveTab('lessons')
    }
    if (activeTab === 'chat' && isGuest) {
      setActiveTab('lessons')
    }
  }, [user, isGuest, activeTab])

  useEffect(() => {
    if (user || isGuest) {
      setActiveLessonModal(null)
      setActiveLab(null)
      setActiveQuizModal(null)
      if (!isAdmin && activeTab === 'admin') {
        setActiveTab('lessons')
      }
      if (isGuest && activeTab === 'chat') {
        setActiveTab('lessons')
      }
      setRefreshProgress(prev => prev + 1)
      setRefreshHistory(prev => prev + 1)
    }
  }, [user?.id, user?._id, isGuest])

  const triggerRefreshHistory = () => {
    setRefreshHistory(prev => prev + 1)
  }

  // Handle tab changes with role protection
  const handleTabChange = (tab) => {
    // Guests cannot access chat
    if (tab === 'chat' && isGuest) {
      return
    }
    // Only admin can access admin panel
    if (tab === 'admin' && !isAdmin) {
      return
    }
    setActiveTab(tab)
  }

  const handleNewSession = async () => {
    if (!user || isGuest) return
    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions?title=Cuộc trò chuyện mới`
      )
      setCurrentSessionId(response.data.session_id || response.data.id)
      triggerRefreshHistory()
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080d] bg-mesh flex flex-col items-center justify-center text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center mb-4 shadow-md shadow-amber-500/10 shield-pulse">
          <Shield className="w-9 h-9 text-amber-500" />
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>VAULT SECURITY CORE INITIALIZING...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <RegisterPage onToggleLogin={() => setAuthMode('login')} />
    }
    return <LoginPage onToggleRegister={() => setAuthMode('register')} />
  }

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-[#06080d] text-slate-100 font-sans">
      <div className="bg-mesh" />

      {/* Platform Header with Role Badge */}
      <PlatformHeader user={user} />

      <div className="relative z-10 flex flex-1 w-full h-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          user={user}
          onLogout={logout}
        />

        {/* Main Content Areas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Tab - only for user/admin */}
          {activeTab === 'chat' && !isGuest && (
            <>
              {/* Chat History Pane */}
              <div className="w-72 border-r border-slate-800 overflow-hidden bg-slate-950/40 backdrop-blur-md">
                <ChatHistory
                  userId={user.id || user._id}
                  currentSessionId={currentSessionId}
                  onSelectSession={setCurrentSessionId}
                  onNewSession={handleNewSession}
                  refreshTrigger={refreshHistory}
                />
              </div>

              {/* Chat Window Pane */}
              <div className="flex-1 overflow-hidden">
                {currentSessionId ? (
                  <ChatWindow
                    sessionId={currentSessionId}
                    userId={user.id || user._id}
                    onSessionUpdated={triggerRefreshHistory}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-cyber-surface">
                    <div className="text-center animate-fade-in max-w-sm">
                      <div className="w-20 h-20 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mx-auto mb-6 shadow-md shadow-vault-gold/10">
                        <MessageSquare className="w-10 h-10 text-vault-gold" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-200 mb-1.5 font-display">Bắt đầu Cuộc Trò Chuyện</h3>
                      <p className="text-sm text-slate-400 mb-6">Chọn từ danh sách bên trái hoặc tạo một cuộc trò chuyện AI mới để bắt đầu hỏi đáp.</p>
                      <button
                        onClick={handleNewSession}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-vault-gold via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 px-6 py-3 rounded-xl transition-all font-bold text-sm active:scale-95 shadow-md shadow-vault-gold/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Tạo cuộc trò chuyện mới</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Chat Tab - guest blocked */}
          {activeTab === 'chat' && isGuest && (
            <div className="flex-1 flex items-center justify-center bg-cyber-surface">
              <div className="text-center animate-fade-in max-w-sm">
                <div className="w-20 h-20 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-200 mb-1.5 font-display">Cần đăng nhập</h3>
                <p className="text-sm text-slate-400">Tính năng AI Chat yêu cầu tài khoản User hoặc Admin.</p>
              </div>
            </div>
          )}


          {/* Lessons Tab */}
          {activeTab === 'lessons' && (
            <div className="flex-1 overflow-auto bg-cyber-surface">
              <LessonsPage 
                refreshTrigger={refreshProgress}
                lessons={lessons}
                onSelectLesson={(lesson) => setActiveLessonModal(lesson)}
                onStartLab={(lesson) => {
                  if (!isGuest) {
                    setActiveLab(lesson)
                  }
                }}
              />
            </div>
          )}

          {/* Lab Tab */}
          {activeTab === 'lab' && (
            <div className="flex-1 overflow-auto bg-cyber-surface">
              <LabRunnerPage 
                lessons={lessons} 
                refreshTrigger={refreshProgress}
                onStartLab={(lesson) => {
                  if (!isGuest) {
                    setActiveLab(lesson)
                  }
                }}
              />
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="flex-1 overflow-auto bg-cyber-surface">
              <ProfilePage lessons={lessons} />
            </div>
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && user && user.role === 'admin' && (
            <div className="flex-1 overflow-auto bg-[#06080d]">
              <AdminDashboard onLessonsUpdated={() => setRefreshProgress(prev => prev + 1)} />
            </div>
          )}
        </div>
      </div>

      {/* Lesson Modal Overlay */}
      {activeLessonModal && !activeLab && (
        <LessonModal
          lesson={activeLessonModal}
          isCompleted={false}
          onClose={() => setActiveLessonModal(null)}
          onStartQuiz={(les) => setActiveQuizModal(les)}
          onStartLab={(les) => {
            if (!isGuest) {
              setActiveLab(les)
              setActiveLessonModal(null)
            }
          }}
        />
      )}

      {/* Quiz Modal Overlay */}
      {activeQuizModal && (
        <QuizModal
          lesson={activeQuizModal}
          onClose={() => {
            setActiveQuizModal(null)
            setActiveLessonModal(null)
          }}
          onBackToLesson={() => setActiveQuizModal(null)}
          onCompleteLesson={async (lessonId) => {
            try {
              const token = localStorage.getItem('access_token')
              const headers = token ? { Authorization: `Bearer ${token}` } : {}
              const normLessonId = lessonId ? lessonId.replace('_', '-') : ''
              await axios.put(`${API_BASE_URL}/roadmap/progress/current/complete-lesson?lesson_id=${normLessonId}`, {}, { headers })
            } catch (err) {
              console.error('Error saving quiz completion progress:', err)
            }
            setRefreshProgress(prev => prev + 1)
          }}
        />
      )}

      {/* Lab Workspace Overlay */}
      {activeLab && (
        <LabWorkspace
          lesson={activeLab}
          onClose={() => setActiveLab(null)}
          onComplete={async () => {
            setActiveLab(null);
            // Save progress in DB
            try {
              const token = localStorage.getItem('access_token');
              const headers = token ? { Authorization: `Bearer ${token}` } : {};
              const normLessonId = activeLab.id ? activeLab.id.replace('_', '-') : '';
              const normLabId = normLessonId.startsWith('lab-') ? normLessonId : `lab-${normLessonId}`;
              
              await axios.put(`${API_BASE_URL}/roadmap/progress/current/complete-lesson?lesson_id=${normLabId}`, {}, { headers });
              if (!normLessonId.startsWith('lab-')) {
                await axios.put(`${API_BASE_URL}/roadmap/progress/current/complete-lesson?lesson_id=${normLessonId}`, {}, { headers });
              }
            } catch (err) {
              console.error('Error auto-completing lab progress:', err);
            }
            setRefreshProgress(prev => prev + 1);
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}
