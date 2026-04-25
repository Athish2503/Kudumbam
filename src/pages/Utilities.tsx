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
  Bell,
  ChevronLeft,
  ChevronRight
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
  const [milkData, setMilkData] = useState({ delivered: false, extra: 0, lastUpdated: '' });
  const [gasData, setGasData] = useState({ lastBooked: '', estimatedDays: 45, status: 'running' });
  const [milkLog, setMilkLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const { showToast } = useToast();

  useEffect(() => {
    // Listen to Utilities metadata
    const unsubMetadata = onSnapshot(doc(db, 'metadata', 'utilities'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMilkData(data.milk || { delivered: false, extra: 0, lastUpdated: '' });
        setGasData(data.gas || { lastBooked: '', estimatedDays: 45, status: 'running' });
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
       if (lastDate !== today && milkData.delivered) {
          setDoc(doc(db, 'metadata', 'utilities'), { 
            milk: {
              delivered: false,
              extra: 0,
              lastUpdated: new Date().toISOString()
            }
          }, { merge: true });
       }
    }
  }, [milkData]);

  const toggleMilk = async () => {
    const newStatus = !milkData.delivered;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    try {
      // Update real-time metadata
      await setDoc(doc(db, 'metadata', 'utilities'), { 
        milk: {
          delivered: newStatus,
          lastUpdated: new Date().toISOString()
        }
      }, { merge: true });

      // Update log collection
      if (newStatus) {
        await setDoc(doc(db, 'milk_log', todayStr), {
          date: todayStr,
          delivered: true,
          extra: milkData.extra,
          timestamp: new Date().toISOString(),
          userId: user?.uid
        });
        showToast("Milk delivery recorded!");
        const author = userData?.nickname || user?.displayName || 'Someone';
        sendNotification(user?.uid || '', author, "Confirmed milk delivery for today.");
      } else {
        // If unchecking, we can either delete or set to false. 
        // For simplicity, we'll just keep it but set to false if needed.
        // Actually, usually users don't uncheck unless it was a mistake.
        await setDoc(doc(db, 'milk_log', todayStr), {
          delivered: false
        }, { merge: true });
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to update milk status", "error");
    }
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
    if (milkData.delivered) {
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
    await setDoc(doc(db, 'metadata', 'utilities'), { 
      gas: {
        status: 'delivered'
      }
    }, { merge: true });
    showToast("Gas cylinder delivered!");
  };

  const startUsingGas = async () => {
    await setDoc(doc(db, 'metadata', 'utilities'), { 
      gas: {
        startedDate: new Date().toISOString(),
        status: 'running'
      }
    }, { merge: true });
    showToast("New cylinder started! Timer reset.");
    const author = userData?.nickname || user?.displayName || 'Someone';
    sendNotification(user?.uid || '', author, "Started using a new gas cylinder.");
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
              <div className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-widest font-black ${milkData.delivered ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'}`}>
                 {milkData.delivered ? 'Delivered' : 'Pending'}
              </div>
           </div>

           <div className="flex flex-col items-center justify-center py-6 gap-6">
              <button 
                onClick={toggleMilk}
                className={`w-36 h-36 rounded-full border-4 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 ${
                   milkData.delivered 
                   ? 'bg-emerald-500 border-emerald-100 text-white shadow-xl shadow-emerald-500/20' 
                   : 'bg-white border-[#2D2926]/5 text-[#2D2926]/10 hover:border-emerald-200 hover:text-emerald-500'
                }`}
              >
                 <CheckCircle2 size={48} />
                 <span className="text-[10px] uppercase font-black tracking-widest">{milkData.delivered ? 'Brought' : 'Mark Brought'}</span>
              </button>
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
                const isDelivered = log?.delivered;
                const extra = log?.extra || 0;

                return (
                  <div 
                    key={day.toISOString()} 
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border ${
                      isDelivered 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10' 
                        : isToday(day)
                          ? 'bg-white border-[#2D2926]/10 text-[#2D2926]'
                          : 'bg-white/30 border-transparent text-[#2D2926]/20'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isToday(day) && !isDelivered ? 'underline decoration-2' : ''}`}>
                       {format(day, 'd')}
                    </span>
                    {extra > 0 && (
                      <span className={`text-[7px] font-black absolute bottom-1 ${isDelivered ? 'text-white' : 'text-blue-500'}`}>
                        +{extra}
                      </span>
                    )}
                  </div>
                );
              })}
           </div>

           <div className="pt-6 flex justify-center gap-6 opacity-40">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[8px] uppercase font-black tracking-widest">Brought</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-white border border-[#2D2926]/10"></div>
                 <span className="text-[8px] uppercase font-black tracking-widest">Pending</span>
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
                 <div>
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
                 <div className="flex flex-col items-end gap-3">
                   {gasData.status === 'empty' && (
                     <button onClick={bookGas} className="bg-orange-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all">Book Now</button>
                   )}
                   {gasData.status === 'booked' && (
                     <button onClick={deliverGas} className="bg-blue-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Confirm Delivery</button>
                   )}
                   {gasData.status === 'delivered' && (
                     <button onClick={startUsingGas} className="bg-emerald-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Start Usage</button>
                   )}
                   {gasData.status === 'running' && remaining < 7 && (
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
    </div>
  );
}
