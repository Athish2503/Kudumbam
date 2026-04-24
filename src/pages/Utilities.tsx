import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Milk, 
  Flame, 
  Calendar, 
  Plus, 
  Minus, 
  AlertTriangle,
  History,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { sendNotification } from '../components/NotificationManager';
import { useAuth } from '../App';

export default function Utilities() {
  const { user, userData } = useAuth();
  const [milkData, setMilkData] = useState({ delivered: false, extra: 0, lastUpdated: '' });
  const [gasData, setGasData] = useState({ lastBooked: '', estimatedDays: 45, status: 'running' });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Listen to Utilities metadata
    const unsub = onSnapshot(doc(db, 'metadata', 'utilities'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMilkData(data.milk || { delivered: false, extra: 0, lastUpdated: '' });
        setGasData(data.gas || { lastBooked: '', estimatedDays: 45, status: 'running' });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
    try {
      await setDoc(doc(db, 'metadata', 'utilities'), { 
        milk: {
          delivered: newStatus,
          lastUpdated: new Date().toISOString()
        }
      }, { merge: true });
      if (newStatus) {
        showToast("Milk delivery recorded!");
        const author = userData?.nickname || user?.displayName || 'Someone';
        sendNotification(user?.uid || '', author, "Confirmed milk delivery for today.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateExtraMilk = async (val: number) => {
    await setDoc(doc(db, 'metadata', 'utilities'), { 
      milk: {
        extra: Math.max(0, milkData.extra + val)
      }
    }, { merge: true });
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

  return (
    <div className="space-y-12 pb-20">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Daily Essentials</p>
        <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
          Utilities.
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-10">
        {/* Milk Tracker */}
        <section className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Milk size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-serif italic font-bold">Milk Tracker</h2>
                    <p className="text-[9px] uppercase tracking-widest font-black opacity-30 italic">Daily Delivery</p>
                 </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-widest font-black ${milkData.delivered ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'}`}>
                 {milkData.delivered ? 'Delivered' : 'Pending'}
              </div>
           </div>

           <div className="flex flex-col items-center justify-center py-6 gap-6">
              <button 
                onClick={toggleMilk}
                className={`w-32 h-32 rounded-full border-4 transition-all flex flex-col items-center justify-center gap-2 ${
                   milkData.delivered 
                   ? 'bg-emerald-500 border-emerald-100 text-white shadow-xl shadow-emerald-500/20' 
                   : 'bg-white border-[#2D2926]/5 text-[#2D2926]/10 hover:border-emerald-200 hover:text-emerald-500'
                }`}
              >
                 <CheckCircle2 size={40} />
                 <span className="text-[9px] uppercase font-black tracking-tighter">{milkData.delivered ? 'Done' : 'Tap to Confirm'}</span>
              </button>
           </div>

           <div className="pt-8 border-t border-[#2D2926]/5 flex items-center justify-between">
              <div>
                 <p className="text-[10px] uppercase tracking-widest font-black opacity-30 mb-1">Extra Packets</p>
                 <p className="text-2xl font-serif italic font-bold">+{milkData.extra}</p>
              </div>
              <div className="flex bg-[#FDFBF7] rounded-2xl border border-[#2D2926]/5 p-2">
                 <button onClick={() => updateExtraMilk(-1)} className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-xl transition-all"><Minus size={18} /></button>
                 <button onClick={() => updateExtraMilk(1)} className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-xl transition-all"><Plus size={18} /></button>
              </div>
           </div>
        </section>

        {/* Gas Tracker */}
        <section className="bg-[#1A1A1A] p-8 rounded-[40px] shadow-2xl space-y-10 relative overflow-hidden">
           <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4 text-white">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 text-orange-400 flex items-center justify-center">
                    <Flame size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-serif italic font-bold">LPG Cylinder</h2>
                    <p className="text-[9px] uppercase tracking-widest font-black opacity-30 italic">Usage Estimate</p>
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
                 
                 {gasData.status === 'empty' && (
                   <button 
                     onClick={bookGas}
                     className="bg-orange-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                   >
                      Book Now
                   </button>
                 )}
                 {gasData.status === 'booked' && (
                   <button 
                     onClick={deliverGas}
                     className="bg-blue-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                   >
                      Confirm Delivery
                   </button>
                 )}
                 {gasData.status === 'delivered' && (
                   <button 
                     onClick={startUsingGas}
                     className="bg-emerald-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                   >
                      Start Using
                   </button>
                 )}
                 {gasData.status === 'running' && remaining < 5 && (
                   <button 
                     onClick={bookGas}
                     className="bg-rose-500 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 animate-pulse"
                   >
                      Book Next
                   </button>
                 )}
              </div>
           </div>

           <div className="space-y-4 relative z-10">
              <div className="flex items-end justify-between text-white px-2">
                 <div>
                    <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-1">Status: {gasData.status}</p>
                    {gasData.status === 'running' ? (
                      <p className={`text-5xl font-serif italic font-black ${remaining < 10 ? 'text-rose-500' : 'text-emerald-400'}`}>
                         {remaining} <span className="text-sm font-sans not-italic opacity-30">Days Left</span>
                      </p>
                    ) : (
                      <p className="text-2xl font-serif italic font-bold opacity-60">
                        {gasData.status === 'booked' ? 'Waiting for Delivery...' : 
                         gasData.status === 'delivered' ? 'Cylinder is Ready!' : 'Cylinder is Empty'}
                      </p>
                    )}
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-1">
                       {gasData.status === 'running' ? 'Started On' : 'Booked On'}
                    </p>
                    <p className="text-xs font-bold">
                       {gasData.status === 'running' 
                        ? (gasData.startedDate ? new Date(gasData.startedDate).toLocaleDateString() : 'N/A')
                        : (gasData.lastBooked ? new Date(gasData.lastBooked).toLocaleDateString() : 'No record')}
                    </p>
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

           {remaining < 10 && (
             <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl relative z-10">
                <AlertTriangle className="text-rose-500" size={18} />
                <p className="text-white/60 text-[9px] uppercase tracking-widest font-bold">Low Gas Alert: Order soon to avoid "Mid-Sambar" crisis!</p>
             </div>
           )}

           <Flame size={180} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
        </section>
      </div>
    </div>
  );
}
