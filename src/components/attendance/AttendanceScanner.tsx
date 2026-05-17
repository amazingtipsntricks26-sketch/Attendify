import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, CheckCircle2, XCircle, User, MapPin, ShieldAlert } from 'lucide-react';
import { getFaceEmbedding, compareFaceEmbeddings } from '@/src/services/faceService';
import { initFirebase, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, where, limit } from 'firebase/firestore';
import { Employee } from '@/src/types';
import { GEOFENCE, FACE_SIMILARITY_THRESHOLD } from '@/src/constants';
import { calculateDistance } from '@/src/lib/location';
import confetti from 'canvas-confetti';

export default function AttendanceScanner() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [matchedUser, setMatchedUser] = useState<Employee | null>(null);
  const [error, setError] = useState('');
  const [scanType, setScanType] = useState<'check-in' | 'check-out'>('check-in');
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null);
  
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const checkGeofence = async () => {
      const pos = await getLocation();
      if (pos) {
        const dist = calculateDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          GEOFENCE.LATITUDE,
          GEOFENCE.LONGITUDE
        );
        setCurrentDistance(dist);
        setIsWithinGeofence(dist <= GEOFENCE.RADIUS_METERS);
      }
    };
    
    checkGeofence();
    const interval = setInterval(checkGeofence, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const fb = await initFirebase();
        if (fb) {
          const snapshot = await getDocs(collection(fb.db, 'employees'));
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
          setEmployees(list);
        } else {
          const list = JSON.parse(localStorage.getItem('employees') || '[]');
          setEmployees(list);
        }
      } catch (err: any) {
        console.error('Failed to load employees:', err);
      }
    };
    loadEmployees();
  }, []);

  const getLocation = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const performScan = async () => {
    if (!webcamRef.current || status === 'scanning') return;
    
    setStatus('scanning');
    setError('');
    setIsScanning(true);
    
    try {
      const video = webcamRef.current.video;
      if (!video) throw new Error('Camera not ready');
      
      // 1. Check Geofence
      const location = await getLocation();
      if (location) {
        const dist = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          GEOFENCE.LATITUDE,
          GEOFENCE.LONGITUDE
        );
        setCurrentDistance(dist);
        const within = dist <= GEOFENCE.RADIUS_METERS;
        setIsWithinGeofence(within);

        if (!within) {
          setStatus('failed');
          setError(`Out of Bounds: You are ${Math.round(dist)}m away from the designated attendance area.`);
          setTimeout(() => setStatus('idle'), 5000);
          return;
        }
      } else {
        setStatus('failed');
        setError('Location required: Please enable GPS to mark attendance.');
        setTimeout(() => setStatus('idle'), 5000);
        return;
      }

      // 2. Face Recognition
      const currentEmbedding = await getFaceEmbedding(video);
      if (!currentEmbedding) {
        setStatus('failed');
        setError('No face detected. Please try again.');
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }
      
      // Find best match
      let bestMatch: Employee | null = null;
      let highestScore = 0;
      
      for (const emp of employees) {
        const score = compareFaceEmbeddings(currentEmbedding, emp.faceDescriptor);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = emp;
        }
      }

      console.log('Match debug:', { 
        matchFound: !!bestMatch, 
        highestScore: highestScore.toFixed(4), 
        threshold: FACE_SIMILARITY_THRESHOLD 
      });
      
      if (bestMatch && highestScore > FACE_SIMILARITY_THRESHOLD) {
        setMatchedUser(bestMatch);
        setStatus('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#22c55e']
        });
        
        // Log attendance
        const location = await getLocation();
        const fb = await initFirebase();
        
        const logData = {
          employeeId: bestMatch.employeeId,
          employeeName: bestMatch.name,
          timestamp: Date.now(),
          status: scanType,
          method: 'face',
          location: location ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          } : null,
          offline: !navigator.onLine || !fb
        };

        if (fb) {
          await addDoc(collection(fb.db, 'attendance'), {
            ...logData,
            timestamp: serverTimestamp()
          });
        } else {
          const existing = JSON.parse(localStorage.getItem('attendance') || '[]');
          localStorage.setItem('attendance', JSON.stringify([...existing, { ...logData, id: `local_${Date.now()}` }]));
        }
        
        setTimeout(() => {
          setStatus('idle');
          setMatchedUser(null);
        }, 5000);
      } else {
        setStatus('failed');
        setError('Identity not verified. Unrecognized face.');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err: any) {
      setError('Scan error: ' + err.message);
      setStatus('failed');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 capitalize">{scanType} Scanner</h1>
          <p className="text-gray-500">Scan your face to mark your daily attendance</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm w-fit">
          <button 
            onClick={() => setScanType('check-in')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${scanType === 'check-in' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Check In
          </button>
          <button 
            onClick={() => setScanType('check-out')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${scanType === 'check-out' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Check Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative aspect-square md:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              {...({} as any)}
            />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`w-64 h-64 border-2 border-dashed rounded-3xl transition-all duration-500 ${
                status === 'scanning' ? 'border-blue-400 scale-110' : 
                status === 'success' ? 'border-green-500 scale-105' : 
                status === 'failed' ? 'border-red-500' : 
                'border-white/30'
              }`}>
                {status === 'scanning' && (
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                  />
                )}
              </div>
            </div>

            <AnimatePresence>
              {status === 'success' && matchedUser && (
                <motion.div 
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 shadow-xl border border-white"
                >
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Verified Identity</p>
                    <p className="text-xl font-bold text-gray-900">{matchedUser.name}</p>
                    <p className="text-sm text-green-600 font-medium">Attendance logged successfully!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {status === 'failed' && (
              <div className="absolute inset-0 bg-red-900/20 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-2xl shadow-xl max-w-xs">
                  <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                  <p className="text-gray-900 font-bold text-lg mb-1">Verification Failed</p>
                  <p className="text-gray-500 text-sm">{error}</p>
                </motion.div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={performScan}
              disabled={status === 'scanning'}
              className={`w-full sm:flex-1 py-4 px-8 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                scanType === 'check-in' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-200'
              } disabled:opacity-50`}
            >
              {status === 'scanning' ? <RefreshCw className="animate-spin" /> : <Camera />}
              {status === 'scanning' ? 'Verifying...' : 'Authenticate Now'}
            </button>
            <div className="flex items-center gap-2 text-gray-400 bg-white px-4 py-4 rounded-2xl border border-gray-200">
              <MapPin size={18} className={isWithinGeofence ? 'text-green-500' : 'text-red-500'} />
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-none">{isWithinGeofence ? 'Inside Range' : 'Outside Range'}</span>
                {currentDistance !== null && (
                  <span className="text-[10px]">{Math.round(currentDistance)}m from base</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RefreshCw size={18} className="text-blue-500" />
              Recent Logs
            </h3>
            <div className="space-y-4">
              {/* This would ideally come from the database */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-gray-100 rounded mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="font-bold text-lg mb-2">Need Help?</h3>
            <p className="text-blue-100 text-sm mb-4 leading-relaxed">
              If the scanner fails multiple times, try improving the lighting or removing eyewear. 
              Contact admin for manual entry.
            </p>
            <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-2 rounded-xl text-sm font-bold transition-all">
              Troubleshooting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
