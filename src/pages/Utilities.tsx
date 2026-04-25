import React, { useState, useEffect } from 'react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Milk as MilkIcon, 
  Flame, 
  Calendar as CalendarIcon, 
  Plus, 
  Minus, 
  AlertTriangle,
  History,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { sendNotification } from '../components/NotificationManager';
import { useAuth } from '../App';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO
} from 'date-fns';

export default function Utilities() {
  const { user, userData } = useAuth();
  const [milkData, setMilkData] = useState({ status: 'pending', extra: 0, lastUpdated: '' });
  const [gasData, setGasData] = useState({ 
    lastBooked: '', 
    estimatedDays: 45, 
    status: 'running',
    fullStock: 0,
    emptyStock: 0,
    startedDate: ''
  });
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [milkLog, setMilkLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const { showToast } = useToast();

  useEffect(() => {
    // Listen to Utilities metadata
    const unsubMetadata = onSnapshot(doc(db, 'metadata', 'utilities'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMilkData(data.milk || { status: 'pending', extra: 0, lastUpdated: '' });
        const gas = data.gas || {};
        setGasData({ 
          lastBooked: gas.lastBooked || '', 
          estimatedDays: gas.estimatedDays || 45, 
          status: gas.status || 'running',
          fullStock: gas.fullStock || 0,
          emptyStock: gas.emptyStock || 0,
          startedDate: gas.startedDate || ''
        });
      }
      setLoading(false);
    });

    // Listen to Milk Logs for current month
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    
    const milkQuery = query(
      collection(db, 'milk_log'),
      where('date', '>=', format(start, 'yyyy-MM-dd')),
      where('date', '<=', format(end, 'yyyy-MM-dd')),
      orderBy('date', 'asc')
    );

    const unsubLogs = onSnapshot(milkQuery, (snapshot) => {
      setMilkLog(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubMetadata();
      unsubLogs();
    };
  }, [viewDate]);

  // Reset milk daily if needed (simple check)
  useEffect(() => {
    if (milkData.lastUpdated) {
       const lastDate = new Date(milkData.lastUpdated).toDateString();
       const today = new Date().toDateString();
       if (lastDate !== today && milkData.status !== 'pending') {
          setDoc(doc(db, 'metadata', 'utilities'), { 
            milk: {
              status: 'pending',
              extra: 0,
              lastUpdated: new Date().toISOString()
            }
          }, { merge: true });
       }
    }
  }, [milkData]);

  const setMilkStatusForDate = async (date: string, status: 'delivered' | 'skipped' | 'pending', extra: number = 0) => {
    const author = userData?.nickname || user?.displayName || 'Someone';
    const isTodayDate = date === format(new Date(), 'yyyy-MM-dd');
    
    try {
      if (isTodayDate) {
        await setDoc(doc(db, 'metadata', 'utilities'), { 
          milk: {
            status,
            extra,
            lastUpdated: new Date().toISOString()
          }
        }, { merge: true });
      }

      if (status === 'delivered') {
        await setDoc(doc(db, 'milk_log', date), {
          date,
          status: 'delivered',
          extra,
          timestamp: new Date().toISOString(),
          userId: user?.uid
        });
        showToast(`Milk recorded for ${date}`);
      } else if (status === 'skipped') {
        await setDoc(doc(db, 'milk_log', date), {
          date,
          status: 'skipped',
          extra: 0,
          timestamp: new Date().toISOString(),
          userId: user?.uid
        });
        showToast(`Marked no milk for ${date}`);
      } else {
        await setDoc(doc(db, 'milk_log', date), { status: 'pending' }, { merge: true });
      }
      setSelectedDate(null);
    } catch (e) {
      showToast("Failed to update milk log", "error");
    }
  };

  const setMilkStatus = async (status: 'delivered' | 'skipped' | 'pending') => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await setMilkStatusForDate(todayStr, status, milkData.extra);
  };

  const updateExtraMilk = async (val: number) => {
    const newVal = Math.max(0, milkData.extra + val);
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    await setDoc(doc(db, 'metadata', 'utilities'), { 
      milk: {
        extra: newVal
      }
    }, { merge: true });

    // If already delivered today, update the log too
    if (milkData.status === 'delivered') {
      await setDoc(doc(db, 'milk_log', todayStr), {
        extra: newVal
      }, { merge: true });
    }
  };

  const bookGas = async () => {
    try {
      await setDoc(doc(db, 'metadata', 'utilities'), { 
        gas: {
          lastBooked: new Date().toISOString(),
          status: 'booked'
        }
      }, { merge: true });
      showToast("Gas cylinder booked!");
      const author = userData?.nickname || user?.displayName || 'Someone';
      sendNotification(user?.uid || '', author, "Has booked a new gas cylinder.");
    } catch (e) {
      console.error(e);
    }
  };

  const deliverGas = async () => {
    try {
      await setDoc(doc(db, 'metadata', 'utilities'), { 
        gas: {
          status: 'delivered',
          fullStock: (gasData.fullStock || 0) + 1,
          emptyStock: Math.max(0, (gasData.emptyStock || 0) - 1)
        }
      }, { merge: true });
      showToast("Gas cylinder delivered!");
    } catch (e) {
      console.error(e);
    }
  };

  const startUsingGas = async () => {
    try {
      await setDoc(doc(db, 'metadata', 'utilities'), { 
        gas: {
          startedDate: new Date().toISOString(),
          status: 'running',
          fullStock: Math.max(0, (gasData.fullStock || 0) - 1)
        }
      }, { merge: true });
      showToast("New cylinder started! Timer reset.");
      const author = userData?.nickname || user?.displayName || 'Someone';
      sendNotification(user?.uid || '', author, "Started using a new gas cylinder.");
    } catch (e) {
      console.error(e);
    }
  };

  const markGasEmpty = async () => {
    try {
      await setDoc(doc(db, 'metadata', 'utilities'), { 
        gas: {
          status: 'empty',
          emptyStock: (gasData.emptyStock || 0) + 1
        }
      }, { merge: true });
      showToast("Current cylinder is empty.");
    } catch (e) {
      console.error(e);
    }
  };

  const updateGasConfig = async (config: any) => {
    try {
      const mergedGas = {
        ...gasData,
        ...config
      };
      
      // Clean undefined and NaN values for Firestore
      const cleanGas = Object.fromEntries(
        Object.entries(mergedGas).filter(([_, v]) => v !== undefined && (typeof v !== 'number' || !isNaN(v)))
      );

      await setDoc(doc(db, 'metadata', 'utilities'), { 
        gas: cleanGas
      }, { merge: true });
      showToast("Gas configuration updated!");
      setIsGasModalOpen(false);
    } catch (e) {
      console.error(e);
      showToast("Failed to update gas config", "error");
    }
  };

  const calculateGasRemaining = () => {
    if (gasData.status !== 'running' || !gasData.startedDate) return 0;
    const started = new Date(gasData.startedDate).getTime();
    const now = new Date().getTime();
    const daysPassed = Math.floor((now - started) / (1000 * 60 * 60 * 24));
    return Math.max(0, gasData.estimatedDays - daysPassed);
  };

  const remaining = calculateGasRemaining();
  const gasPercent = (remaining / gasData.estimatedDays) * 100;

  // Calendar logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end: endOfMonth(viewDate)
  });

  return (
    <div className="space-y-12 pb-20">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Daily Essentials</p>
        <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
          Essential.
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-12">
        {/* Milk Tracker Card */}
        <section className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <MilkIcon size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-serif italic font-bold">Milk Tracker</h2>
                    <p className="text-[9px] uppercase tracking-widest font-black opacity-30 italic">Daily Packet Check</p>
                 </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-widest font-black ${
                milkData.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 
                milkData.status === 'skipped' ? 'bg-rose-50 text-rose-600' :
                'bg-amber-50 text-amber-600 animate-pulse'
              }`}>
                 {milkData.status === 'delivered' ? 'Delivered' : milkData.status === 'skipped' ? 'No Milk Today' : 'Pending'}
              </div>
           </div>

            <div className="flex flex-col items-center justify-center py-6 gap-8">
               <div className="flex flex-wrap justify-center gap-8">
                  <button 
                    onClick={() => setMilkStatus(milkData.status === 'delivered' ? 'pending' : 'delivered')}
                    className={`w-32 h-32 rounded-full border-4 transition-all flex flex-col items-center justify-center gap-2 active:scale-95 ${
                       milkData.status === 'delivered' 
                       ? 'bg-emerald-500 border-emerald-100 text-white shadow-xl shadow-emerald-500/20' 
                       : 'bg-white border-[#2D2926]/5 text-[#2D2926]/10 hover:border-emerald-200 hover:text-emerald-500'
                    }`}
                  >
                     <CheckCircle2 size={32} />
                     <span className="text-[9px] uppercase font-black tracking-widest">{milkData.status === 'delivered' ? 'Brought' : 'Mark Brought'}</span>
                  </button>

                  <button 
                    onClick={() => setMilkStatus(milkData.status === 'skipped' ? 'pending' : 'skipped')}
                    className={`w-32 h-32 rounded-full border-4 transition-all flex flex-col items-center justify-center gap-2 active:scale-95 ${
                       milkData.status === 'skipped' 
                       ? 'bg-rose-500 border-rose-100 text-white shadow-xl shadow-rose-500/20' 
                       : 'bg-white border-[#2D2926]/5 text-[#2D2926]/10 hover:border-rose-200 hover:text-rose-500'
                    }`}
                  >
                     <X size={32} />
                     <span className="text-[9px] uppercase font-black tracking-widest">{milkData.status === 'skipped' ? 'No Milk' : 'No Milk Today'}</span>
                  </button>
               </div>
            </div>

           <div className="pt-8 border-t border-[#2D2926]/5 flex items-center justify-between">
              <div>
                 <p className="text-[10px] uppercase tracking-widest font-black opacity-30 mb-1">Extra Packets</p>
                 <p className="text-3xl font-serif italic font-black">+{milkData.extra}</p>
              </div>
              <div className="flex bg-[#FDFBF7] rounded-2xl border border-[#2D2926]/5 p-2 shadow-inner">
                 <button onClick={() => updateExtraMilk(-1)} className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-xl transition-all shadow-sm"><Minus size={18} /></button>
                 <button onClick={() => updateExtraMilk(1)} className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-xl transition-all shadow-sm"><Plus size={18} /></button>
              </div>
           </div>
        </section>

        {/* Milk Calendar View */}
        <section className="bg-[#F5F1EA] p-8 rounded-[40px] space-y-8">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <CalendarIcon size={20} className="opacity-20" />
                 <h2 className="text-xs uppercase tracking-[0.2em] font-black opacity-60">Delivery History</h2>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 opacity-20 hover:opacity-100 transition-opacity"><ChevronLeft size={20} /></button>
                 <span className="text-[10px] uppercase font-black tracking-widest min-w-[80px] text-center">{format(viewDate, 'MMM yyyy')}</span>
                 <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 opacity-20 hover:opacity-100 transition-opacity"><ChevronRight size={20} /></button>
              </div>
           </div>

           <div className="grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-[8px] font-black text-center opacity-20 py-2">{day}</div>
              ))}
              {daysInMonth.map((day) => {
                const log = milkLog.find(l => l.date === format(day, 'yyyy-MM-dd'));
                const status = log?.status || (log?.delivered ? 'delivered' : 'pending');
                const extra = log?.extra || 0;

                return (
                  <button 
                    key={day.toISOString()} 
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border active:scale-90 ${
                      status === 'delivered' 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10' 
                        : status === 'skipped'
                          ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/10'
                          : isToday(day)
                            ? 'bg-white border-[#2D2926]/10 text-[#2D2926]'
                            : 'bg-white/30 border-transparent text-[#2D2926]/20'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isToday(day) && status === 'pending' ? 'underline decoration-2' : ''}`}>
                       {format(day, 'd')}
                    </span>
                    {extra > 0 && (
                      <span className={`text-[7px] font-black absolute bottom-1 ${status === 'delivered' ? 'text-white' : 'text-blue-500'}`}>
                        +{extra}
                      </span>
                    )}
                  </button>
                );
              })}
           </div>

           <div className="pt-6 flex flex-wrap justify-center gap-6 opacity-40">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[8px] uppercase font-black tracking-widest">Brought</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                 <span className="text-[8px] uppercase font-black tracking-widest">No Milk</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-white border border-[#2D2926]/10"></div>
                 <span className="text-[8px] uppercase font-black tracking-widest">Pending</span>
              </div>
           </div>

           {/* Monthly Summary */}
           <div className="mt-10 pt-8 border-t border-[#2D2926]/5 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                 <p className="text-[8px] uppercase tracking-widest font-black opacity-30">Total Days</p>
                 <p className="text-xl font-serif italic font-black text-[#1A1A1A]">
                   {milkLog.filter(l => l.status === 'delivered').length} <span className="text-[8px] font-sans not-italic opacity-40">Days</span>
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-[8px] uppercase tracking-widest font-black opacity-30">Skipped</p>
                 <p className="text-xl font-serif italic font-black text-rose-500">
                   {milkLog.filter(l => l.status === 'skipped').length} <span className="text-[8px] font-sans not-italic opacity-40">Days</span>
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-[8px] uppercase tracking-widest font-black opacity-30">Extra</p>
                 <p className="text-xl font-serif italic font-black text-blue-500">
                   {milkLog.reduce((acc, curr) => acc + (curr.extra || 0), 0)} <span className="text-[8px] font-sans not-italic opacity-40">Packets</span>
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-[8px] uppercase tracking-widest font-black opacity-30">Total Volume</p>
                 <p className="text-xl font-serif italic font-black text-emerald-600">
                   {milkLog.filter(l => l.status === 'delivered').length + milkLog.reduce((acc, curr) => acc + (curr.extra || 0), 0)} <span className="text-[8px] font-sans not-italic opacity-40">Packets</span>
                 </p>
              </div>
           </div>
        </section>

        {/* Gas Tracker Section */}
        <section className="bg-[#1A1A1A] p-8 rounded-[40px] shadow-2xl space-y-10 relative overflow-hidden">
           <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4 text-white">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 text-orange-400 flex items-center justify-center">
                    <Flame size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-serif italic font-bold">LPG Cylinder</h2>
                    <p className="text-[9px] uppercase tracking-widest font-black opacity-30 italic">Fuel Management</p>
                 </div>
              </div>
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsGasModalOpen(true)}
                    className="p-2 text-white/20 hover:text-white transition-colors"
                  >
                     <Settings size={18} />
                  </button>
                  <div className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-widest font-black ${
                    gasData.status === 'running' ? 'bg-emerald-50 text-emerald-600' :
                    gasData.status === 'booked' ? 'bg-amber-50 text-amber-600 animate-pulse' :
                    gasData.status === 'delivered' ? 'bg-blue-50 text-blue-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                     {gasData.status}
                  </div>
               </div>
           </div>

           <div className="space-y-4 relative z-10">
              <div className="flex items-end justify-between text-white px-2">
                  <div className="flex flex-col gap-1">
                     <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-1">Estimated Remaining</p>
                     {gasData.status === 'running' ? (
                       <p className={`text-5xl font-serif italic font-black ${remaining < 10 ? 'text-rose-500' : 'text-emerald-400'}`}>
                          {remaining} <span className="text-sm font-sans not-italic opacity-30">Days</span>
                       </p>
                     ) : (
                       <p className="text-2xl font-serif italic font-bold opacity-60">
                         {gasData.status === 'booked' ? 'Cylinder Booked' : 
                          gasData.status === 'delivered' ? 'Ready to Install' : 'Empty'}
                       </p>
                     )}
                  </div>
                  <div className="flex gap-6 border-l border-white/5 pl-8">
                     <div>
                        <p className="text-[8px] uppercase tracking-widest font-black opacity-20 mb-1">Full Stock</p>
                        <p className="text-xl font-serif italic font-bold text-emerald-400">{(gasData.fullStock || 0).toString()}</p>
                     </div>
                     <div>
                        <p className="text-[8px] uppercase tracking-widest font-black opacity-20 mb-1">Empty</p>
                        <p className="text-xl font-serif italic font-bold text-rose-500">{(gasData.emptyStock || 0).toString()}</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {gasData.status === 'running' && (
                      <button onClick={markGasEmpty} className="bg-white/10 text-white/40 hover:text-white px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">Mark Empty</button>
                    )}
                    {gasData.status === 'empty' && (
                      <button onClick={bookGas} className="bg-orange-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">Book Now</button>
                    )}
                    {(gasData.status === 'booked' || (gasData.status === 'empty' && gasData.emptyStock > 0)) && (
                      <button onClick={deliverGas} className="bg-blue-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Confirm Delivery</button>
                    )}
                    {(gasData.status === 'delivered' || gasData.fullStock > 0) && gasData.status !== 'running' && (
                      <button onClick={startUsingGas} className="bg-emerald-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Start Usage</button>
                    )}
                    {gasData.status === 'running' && remaining < 7 && gasData.fullStock === 0 && (
                      <button onClick={bookGas} className="bg-rose-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">Book Next</button>
                    )}
                  </div>
              </div>

              {gasData.status === 'running' && (
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${gasPercent}%` }}
                     className={`h-full ${remaining < 10 ? 'bg-rose-500' : 'bg-emerald-500'} transition-all duration-1000`}
                   />
                </div>
              )}
           </div>

           <Flame size={180} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
         </section>
      </div>

      {/* Gas Config Modal */}
      <AnimatePresence>
        {isGasModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGasModalOpen(false)}
              className="absolute inset-0 bg-[#2D2926]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-[calc(100%-2rem)] max-w-[400px] bg-[#FDFBF7] border border-[#2D2926]/10 rounded-[40px] shadow-2xl overflow-hidden relative z-[100] p-8 space-y-8"
            >
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-serif italic text-[#1A1A1A]">Gas Settings</h2>
                 <button onClick={() => setIsGasModalOpen(false)} className="text-[#2D2926]/20"><X /></button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Duration (Days per cylinder)</label>
                    <input 
                      type="number"
                      value={gasData.estimatedDays}
                      onChange={(e) => setGasData({...gasData, estimatedDays: parseInt(e.target.value) || 45})}
                      className="w-full bg-[#F5F1EA] rounded-2xl p-4 font-bold text-lg outline-none"
                    />
                 </div>
                  <div className="space-y-2">
                     <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Booking Date</label>
                     <input 
                       type="date"
                       value={gasData.lastBooked ? format(new Date(gasData.lastBooked), 'yyyy-MM-dd') : ''}
                       onChange={(e) => setGasData({...gasData, lastBooked: new Date(e.target.value).toISOString()})}
                       className="w-full bg-[#F5F1EA] rounded-2xl p-4 font-bold outline-none"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Usage Started Date</label>
                     <input 
                       type="date"
                       value={gasData.startedDate ? format(new Date(gasData.startedDate), 'yyyy-MM-dd') : ''}
                       onChange={(e) => setGasData({...gasData, startedDate: new Date(e.target.value).toISOString()})}
                       className="w-full bg-[#F5F1EA] rounded-2xl p-4 font-bold outline-none"
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Full Stock</label>
                        <div className="flex items-center bg-[#F5F1EA] rounded-2xl p-2">
                           <button onClick={() => setGasData({...gasData, fullStock: Math.max(0, gasData.fullStock - 1)})} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all"><Minus size={14}/></button>
                           <span className="flex-1 text-center font-bold">{gasData.fullStock}</span>
                           <button onClick={() => setGasData({...gasData, fullStock: gasData.fullStock + 1})} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all"><Plus size={14}/></button>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Empty Stock</label>
                        <div className="flex items-center bg-[#F5F1EA] rounded-2xl p-2">
                           <button onClick={() => setGasData({...gasData, emptyStock: Math.max(0, gasData.emptyStock - 1)})} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all"><Minus size={14}/></button>
                           <span className="flex-1 text-center font-bold">{gasData.emptyStock}</span>
                           <button onClick={() => setGasData({...gasData, emptyStock: gasData.emptyStock + 1})} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all"><Plus size={14}/></button>
                        </div>
                     </div>
                  </div>
              </div>

              <button 
                onClick={() => {
                  const finalConfig = {
                    estimatedDays: Number(gasData.estimatedDays) || 45,
                    fullStock: Number(gasData.fullStock) || 0,
                    emptyStock: Number(gasData.emptyStock) || 0
                  };
                  updateGasConfig(finalConfig);
                }}
                className="w-full py-4 bg-[#2D2926] text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl"
              >
                Save Settings
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Milk Date Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="absolute inset-0 bg-[#2D2926]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[360px] bg-[#FDFBF7] rounded-[40px] shadow-2xl p-8 relative z-[100] space-y-8"
            >
              <header className="text-center">
                 <p className="text-[10px] uppercase tracking-widest font-black opacity-30 mb-1">Update Log</p>
                 <h2 className="text-2xl font-serif italic font-black">{format(selectedDate, 'EEEE, MMM do')}</h2>
              </header>

              <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={() => setMilkStatusForDate(format(selectedDate, 'yyyy-MM-dd'), 'delivered', 0)}
                  className="bg-emerald-50 text-emerald-600 p-6 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all"
                 >
                    <CheckCircle2 size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Brought</span>
                 </button>
                 <button 
                  onClick={() => setMilkStatusForDate(format(selectedDate, 'yyyy-MM-dd'), 'skipped', 0)}
                  className="bg-rose-50 text-rose-600 p-6 rounded-3xl flex flex-col items-center gap-3 active:scale-95 transition-all"
                 >
                    <X size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Milk</span>
                 </button>
              </div>

              <div className="pt-4 flex flex-col items-center gap-4">
                 <p className="text-[10px] uppercase tracking-widest font-black opacity-30">Reset to Pending?</p>
                 <button 
                  onClick={() => setMilkStatusForDate(format(selectedDate, 'yyyy-MM-dd'), 'pending')}
                  className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
                 >
                   Clear Record
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
