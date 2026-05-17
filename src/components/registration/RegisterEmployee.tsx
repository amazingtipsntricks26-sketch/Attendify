import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'motion/react';
import { Camera, Save, User, Hash, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getFaceEmbedding } from '@/src/services/faceService';
import { initFirebase, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function RegisterEmployee() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
  });
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const webcamRef = useRef<Webcam>(null);

  const captureFace = async () => {
    if (!webcamRef.current) return;
    setIsCapturing(true);
    setError('');
    
    try {
      const video = webcamRef.current.video;
      if (video) {
        const emb = await getFaceEmbedding(video);
        if (emb) {
          setEmbedding(emb);
          setStep(3);
        } else {
          setError('No face detected. Please position your face clearly in the frame.');
        }
      }
    } catch (err: any) {
      setError('Failed to capture face: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async () => {
    if (!embedding) return;
    setLoading(true);
    setError('');
    
    try {
      const fb = await initFirebase();
      
      const employeeData = {
        name: formData.name,
        employeeId: formData.employeeId,
        email: formData.email,
        faceDescriptor: embedding,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      if (fb) {
        await addDoc(collection(fb.db, 'employees'), {
          ...employeeData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Local fallback
        const existing = JSON.parse(localStorage.getItem('employees') || '[]');
        localStorage.setItem('employees', JSON.stringify([...existing, { ...employeeData, id: `local_${Date.now()}` }]));
      }
      
      setSuccess(true);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'employees');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Registration Complete</h2>
        <p className="text-gray-500 mb-8">{formData.name} has been registered successfully.</p>
        <button 
          onClick={() => {
            setSuccess(false);
            setStep(1);
            setFormData({ name: '', employeeId: '', email: '' });
            setEmbedding(null);
          }}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold"
        >
          Register Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Registration</h1>
          <p className="text-gray-500">Add a new employee and capture their biometric data</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`w-3 h-3 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      <motion.div 
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm"
      >
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">1. Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      value={formData.employeeId}
                      onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="EMP001"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.employeeId}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Continue to Face Capture
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center">
            <h2 className="text-xl font-bold text-gray-800">2. Face Biometrics</h2>
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-4 border-gray-100">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                {...({} as any)}
              />
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[20%]"></div>
              </div>
            </div>
            <p className="text-sm text-gray-500">Align face within the frame and ensure good lighting.</p>
            
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            
            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button 
                onClick={captureFace}
                disabled={isCapturing}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCapturing ? <RefreshCw className="animate-spin" /> : <Camera />}
                {isCapturing ? 'Analyzing...' : 'Capture Face'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">3. Final Review</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col items-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <User size={48} />
              </div>
              <p className="text-lg font-bold text-gray-900">{formData.name}</p>
              <p className="text-sm text-gray-500">ID: {formData.employeeId}</p>
              <div className="mt-4 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                Face Embedding Ready
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
              >
                Recapture
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" /> : <Save />}
                {loading ? 'Saving...' : 'Complete Registration'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
