import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Clock, 
  Calendar, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  CheckCircle,
  XCircle,
  TrendingUp,
  UserCheck,
  UserX
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { initFirebase } from '@/src/lib/firebase';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { Employee, AttendanceRecord } from '@/src/types';
import { format } from 'date-fns';

export default function AdminDashboard({ appState }: { appState: any }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fb = await initFirebase();
        
        if (fb) {
          const empSnapshot = await getDocs(collection(fb.db, 'employees'));
          const empList = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
          setEmployees(empList);

          const logsQuery = query(collection(fb.db, 'attendance'), orderBy('timestamp', 'desc'), limit(50));
          const logsSnapshot = await getDocs(logsQuery);
          const logsList = logsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            timestamp: doc.data().timestamp?.toMillis ? doc.data().timestamp.toMillis() : Date.now()
          }));
          setLogs(logsList);
        } else {
          const empList = JSON.parse(localStorage.getItem('employees') || '[]');
          setEmployees(empList);
          
          const logsList = JSON.parse(localStorage.getItem('attendance') || '[]');
          setLogs(logsList.sort((a: any, b: any) => b.timestamp - a.timestamp));
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: 'Total Employees', value: employees.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Present Today', value: logs.filter(l => format(l.timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Late Arrivals', value: '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'On Leave', value: '0', icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 border-none">Admin Dashboard</h1>
          <p className="text-gray-500">Overview of your organization's attendance analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">
            <Download size={18} />
            Export CSV
          </button>
          <Link to="/register" className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200">
            <Plus size={18} />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Attendance Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900">Attendance Logs</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search logs..."
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-400 font-bold text-xs uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 bg-gray-100 rounded" /></td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No attendance records found yet.</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                              {log.employeeName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{log.employeeName}</p>
                              <p className="text-[10px] text-gray-400">{log.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            log.status === 'check-in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900 font-medium">{format(log.timestamp, 'HH:mm:ss')}</span>
                            <span className="text-[10px] text-gray-400">{format(log.timestamp, 'MMM dd, yyyy')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500 capitalize">{log.method}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={18} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View All Logs</button>
            </div>
          </div>
        </div>

        {/* Sidebar: Distribution & Online Status */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Employee Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Active Now</span>
                <span className="px-2 py-1 bg-green-500 rounded-full text-[10px] text-white font-bold animate-pulse">LIVE</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Daily Attendance Goal</span>
                  <span className="font-bold text-gray-900">85%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-blue-600 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <TrendingUp size={32} className="text-indigo-300 mb-4" />
              <h3 className="font-bold text-lg mb-2">Weekly Insights</h3>
              <p className="text-indigo-200 text-sm leading-relaxed mb-4">
                Your team shows 12% higher punctuality on Tuesdays. 
                Keep up the momentum!
              </p>
              <button className="w-full bg-indigo-500 hover:bg-indigo-400 py-3 rounded-xl font-bold transition-all">
                Download Report
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-indigo-500/20 rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-white/5 rounded-full" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
