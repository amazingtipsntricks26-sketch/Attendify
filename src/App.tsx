/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Camera, Users, LayoutDashboard, LogIn, Wifi, WifiOff, LogOut, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initFirebase } from '@/src/lib/firebase';
import Login from './components/auth/Login';
import RegisterEmployee from './components/registration/RegisterEmployee';
import AttendanceScanner from './components/attendance/AttendanceScanner';
import AdminDashboard from './components/admin/AdminDashboard';
import { AppState } from './types';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    isOffline: !navigator.onLine,
    isInitializing: true,
    currentUser: null,
  });

  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setAppState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setAppState(prev => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const setup = async () => {
      const fb = await initFirebase();
      if (fb) {
        setFirebaseReady(true);
        fb.auth.onAuthStateChanged((user: any) => {
          setAppState(prev => ({ ...prev, currentUser: user, isInitializing: false }));
        });
      } else {
        const savedUser = JSON.parse(localStorage.getItem('demo_user') || 'null');
        setAppState(prev => ({ ...prev, currentUser: savedUser, isInitializing: false }));
      }
    };

    setup();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (appState.isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-gray-400"
        >
          <Camera size={48} className="animate-pulse" />
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        {/* Top Navbar */}
        <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <CheckCircle size={20} />
            </div>
            <span className="hidden sm:inline">Attendify</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 mr-6">
              <Link to="/attendance" className="text-gray-600 hover:text-blue-600 font-medium">Scan</Link>
              <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-medium">Admin</Link>
            </div>

            <div className={`p-1.5 rounded-full ${appState.isOffline ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`} title={appState.isOffline ? 'Offline' : 'Online'}>
              {appState.isOffline ? <WifiOff size={18} /> : <Wifi size={18} />}
            </div>

            {appState.currentUser ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {appState.currentUser.email?.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={async () => {
                    const { auth } = await initFirebase() || {};
                    if (auth) {
                      auth.signOut();
                    } else {
                      localStorage.removeItem('demo_user');
                      window.location.reload();
                    }
                  }}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
                <LogIn size={20} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home appState={appState} />} />
              <Route path="/attendance" element={<AttendanceScanner />} />
              <Route path="/register" element={<RegisterEmployee />} />
              <Route path="/admin" element={<AdminDashboard appState={appState} />} />
              <Route path="/login" element={appState.currentUser ? <Navigate to="/" /> : <Login />} />
            </Routes>
          </AnimatePresence>
        </main>

        {/* Bottom Mobile Nav */}
        <nav className="md:hidden bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-around sticky bottom-0">
          <Link to="/attendance" className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600">
            <Camera size={20} />
            <span className="text-[10px] font-medium">Scan</span>
          </Link>
          <Link to="/admin" className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600">
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Admin</span>
          </Link>
          <Link to="/register" className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600">
            <Users size={20} />
            <span className="text-[10px] font-medium">Add</span>
          </Link>
        </nav>
      </div>
    </Router>
  );
}

function Home({ appState }: { appState: AppState }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-8 py-10"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
          Smart Attendance <br />
          <span className="text-blue-600">Simplified.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Contactless, biometric attendance system for modern workplaces. 
          Scan your face, mark your presence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
        <Link 
          to="/attendance"
          className="group p-8 bg-white border border-gray-200 rounded-3xl hover:border-blue-500 hover:shadow-xl transition-all duration-300"
        >
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-6">
            <Camera size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily Scan</h2>
          <p className="text-gray-500">Quickly mark your entry or exit using face recognition.</p>
        </Link>

        <Link 
          to="/admin"
          className="group p-8 bg-white border border-gray-200 rounded-3xl hover:border-indigo-500 hover:shadow-xl transition-all duration-300"
        >
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-6">
            <LayoutDashboard size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Management</h2>
          <p className="text-gray-500">View logs, manage employees, and export attendance reports.</p>
        </Link>
      </div>

      {appState.currentUser?.uid === 'demo_123' && (
        <div className="bg-blue-600 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg shadow-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <WifiOff size={18} />
            </div>
            <div>
              <p className="text-sm font-bold">You are in Demo Mode</p>
              <p className="text-xs text-blue-100 italic">Firebase config missing. Data is saved locally in your browser.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Retry Sync
          </button>
        </div>
      )}

      {appState.isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <WifiOff size={20} />
          <p className="text-sm">You are currently offline. Attendance logs will be saved locally and synced when you reconnect.</p>
        </div>
      )}
    </motion.div>
  );
}
