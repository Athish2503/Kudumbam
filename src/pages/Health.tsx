import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { sendNotification } from '../components/NotificationManager';
import { 
  Plus, 
  Trash2, 
  Heart,
  Pill,
  Stethoscope,
  Clock,
  User,
  ArrowRight,
  X,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const LOG_TYPES = [
  { id: 'medication', label: 'Medication', icon: Pill, color: 'text-rose-600', bg: 'bg-rose-50' },
  { id: 'appointment', label: 'Appointment', icon: Stethoscope, color: 'text-sky-600', bg: 'bg-sky-50' },
  { id: 'vitals', label: 'Vitals Log', icon: Heart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function Health() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('medication');
  const [person, setPerson] = useState('');
  const [schedule, setSchedule] = useState(''); // e.g. "Twice a day", "Monday 10 AM"
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'health_logs'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !person) return;

    try {
      await addDoc(collection(db, 'health_logs'), {
        title,
        type,
        person,
        schedule,
        notes,
        status: 'active',
        lastUpdated: new Date().toISOString()
      });
      setTitle('');
      setPerson('');
      setSchedule('');
      setNotes('');
      setIsAdding(false);
      showToast("Health record added!");
      
      const authorName = (useAuth().userData?.nickname || 'Someone');
      sendNotification(useAuth().user?.uid || '', authorName, `Added a health log for ${person}: ${title}`);
    } catch (error) {
      console.error("Error adding health log", error);
      showToast("Failed to add health record", "error");
    }
  };

  const deleteLog = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'health_logs', deleteId));
      showToast("Health record removed.");
      showToast("Event removed from family calendar!");
      
      const authorName = (userData?.nickname || 'Someone');
      sendNotification(user?.uid || '', authorName, `Removed a health log: ${title}`);
    } catch (error) {
      console.error("Error deleting log", error);
      showToast("Failed to remove health record", "error");
    }
  };

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Health Tracker</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Family Health.
          </h1>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-fit py-3 px-8 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all flex items-center gap-3 ${
            isAdding 
              ? 'bg-[#2D2926] text-[#FDFBF7]' 
              : 'bg-rose-600 text-white hover:scale-105 shadow-xl shadow-rose-600/20'
          }`}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          <span>{isAdding ? 'Close' : 'Add Entry'}</span>
        </button>
      </header>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.98 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.98 }}
            className="overflow-hidden"
          >
            <form 
              onSubmit={handleAddLog}
              className="bg-white p-10 rounded-[40px] border border-[#2D2926]/10 space-y-10 shadow-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Subject / Medicine Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Daily Multivitamin, Sugar Checkup..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-transparent text-2xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                      autoFocus
                      required
                    />
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Family Member</label>
                    <input
                      type="text"
                      placeholder="e.g. Amma, Self..."
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                      className="w-full bg-transparent text-2xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                      required
                    />
                 </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Entry Type</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {LOG_TYPES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setType(cat.id)}
                      className={`flex items-center justify-center gap-3 p-5 rounded-2xl border transition-all ${
                        type === cat.id 
                          ? 'bg-[#2D2926] text-[#FDFBF7] border-transparent' 
                          : 'bg-white border-[#2D2926]/5 text-[#2D2926]/40 hover:border-[#2D2926]'
                      }`}
                    >
                      <cat.icon size={18} className={type === cat.id ? 'text-white' : cat.color} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Schedule / Frequency</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/20" size={18} />
                    <input
                      type="text"
                      placeholder="e.g. After Lunch, Every Monday..."
                      value={schedule}
                      onChange={(e) => setSchedule(e.target.value)}
                      className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 pl-12 font-bold text-xs outline-none focus:border-[#2D2926]"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Doctor recommended, keep hydrated..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10 flex items-center justify-center gap-3"
              >
                Save Entry <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
         {logs.map((log) => {
           const Config = LOG_TYPES.find(c => c.id === log.type) || LOG_TYPES[0];
           return (
             <motion.div 
               key={log.id}
               layout
               className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm hover:shadow-2xl transition-all duration-500 group"
             >
                <div className="flex justify-between items-start mb-6">
                   <div className={`p-4 rounded-2xl ${Config.bg} ${Config.color}`}>
                      <Config.icon size={24} />
                   </div>
                   <button onClick={() => setDeleteId(log.id)} className="opacity-0 group-hover:opacity-100 transition-all text-[#2D2926]/10 hover:text-red-500">
                      <Trash2 size={18} />
                   </button>
                </div>

                <div className="space-y-6">
                   <div>
                      <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#A67C52] mb-1">{log.person}</p>
                      <h3 className="text-2xl font-serif italic font-bold text-[#1A1A1A] group-hover:text-rose-600 transition-colors">{log.title}</h3>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-40">
                         <Clock size={14} />
                         {log.schedule || 'As needed'}
                      </div>
                      {log.notes && (
                        <p className="text-[10px] font-medium leading-relaxed opacity-30 italic">
                           "{log.notes}"
                        </p>
                      )}
                   </div>
                </div>
             </motion.div>
           );
         })}

         {logs.length === 0 && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px] space-y-6">
               <History size={60} className="text-[#2D2926]/5 mx-auto" />
               <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-30 italic">No health records yet</p>
            </div>
         )}
      </div>
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteLog}
        title="Delete Record"
        message="Are you sure you want to remove this health record? This action is permanent."
      />
    </div>
  );
}
