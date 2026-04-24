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
  Car, 
  Home, 
  Receipt, 
  Wrench, 
  Clock, 
  ArrowRight, 
  X, 
  Construction 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = [
  { id: 'vehicle', label: 'Vehicle', icon: Car, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'home', label: 'Home Fix', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'bills', label: 'Recurring', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function Maintenance() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('vehicle');
  const [dueDate, setDueDate] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'maintenance'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    try {
      await addDoc(collection(db, 'maintenance'), {
        title,
        category,
        dueDate,
        cost: parseFloat(cost) || 0,
        notes,
        status: 'pending',
        lastUpdated: new Date().toISOString()
      });
      setTitle('');
      setDueDate('');
      setCost('');
      setNotes('');
      setIsAdding(false);
      showToast("Maintenance task recorded!");
      
      const authorName = (useAuth().userData?.nickname || 'Someone');
      sendNotification(useAuth().user?.uid || '', authorName, `Created maintenance task: ${title}`);
    } catch (error) {
      console.error("Error adding maintenance log", error);
      showToast("Failed to record task", "error");
    }
  };

  const toggleStatus = async (log: any) => {
    const newStatus = log.status === 'pending' ? 'completed' : 'pending';
    try {
      await updateDoc(doc(db, 'maintenance', log.id), { 
        status: newStatus,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
       console.error("Error updating status", error);
    }
  };

  const deleteLog = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'maintenance', deleteId));
      showToast("Maintenance record removed.");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting log", error);
      showToast("Failed to remove record", "error");
    }
  };

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Home Maintenance</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Bills & Repairs.
          </h1>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-fit py-3 px-8 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all flex items-center gap-3 ${
            isAdding 
              ? 'bg-[#2D2926] text-[#FDFBF7]' 
              : 'bg-[#1A1A1A] text-white hover:scale-105 shadow-xl shadow-black/20'
          }`}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          <span>{isAdding ? 'Close' : 'Add Task'}</span>
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
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Item / Bill Name</label>
                <input
                  type="text"
                  placeholder="e.g. Car Oil Change, Internet Bill, AC Cleaning..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-3xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-6">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Classification</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center justify-center gap-3 p-5 rounded-2xl border transition-all ${
                        category === cat.id 
                          ? 'bg-[#2D2926] text-[#FDFBF7] border-transparent' 
                          : 'bg-white border-[#2D2926]/5 text-[#2D2926]/40 hover:border-[#2D2926]'
                      }`}
                    >
                      <cat.icon size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Reference #1234..."
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
                Save Task <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
         {logs.map((log) => {
           const Config = CATEGORIES.find(c => c.id === log.category) || CATEGORIES[0];
           const isOverdue = new Date(log.dueDate) < new Date() && log.status === 'pending';
           
           return (
             <motion.div 
               key={log.id}
               layout
               className={`bg-white p-8 rounded-[40px] border flex flex-col md:flex-row md:items-center gap-8 shadow-sm hover:shadow-xl transition-all duration-500 group ${
                 isOverdue ? 'border-red-200 bg-red-50/10' : 'border-[#2D2926]/5'
               }`}
             >
                <div className={`w-16 h-16 rounded-[24px] shrink-0 flex items-center justify-center ${Config.bg} ${Config.color}`}>
                   <Config.icon size={28} />
                </div>

                <div className="flex-1 space-y-1">
                   <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-serif italic font-bold text-[#1A1A1A] group-hover:text-[#A67C52] transition-colors">{log.title}</h3>
                      {isOverdue && <span className="px-3 py-1 bg-red-100 text-red-600 text-[8px] uppercase font-black tracking-widest rounded-full">Overdue</span>}
                   </div>
                   <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 italic">{Config.label} • {log.notes || 'No specific notes'}</p>
                </div>

                <div className="flex items-center gap-12">
                   <div className="text-right">
                      <p className="text-[9px] uppercase tracking-widest font-bold opacity-30 mb-1">Due Date</p>
                      <p className="text-xs font-black text-[#2D2926]">{new Date(log.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] uppercase tracking-widest font-bold opacity-30 mb-1">Cost</p>
                      <p className="text-xs font-black text-[#2D2926]">₹{log.cost.toLocaleString('en-IN')}</p>
                   </div>
                   <div className="flex items-center gap-4 pl-8 border-l border-[#2D2926]/5">
                      <button 
                        onClick={() => toggleStatus(log)}
                        className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                          log.status === 'completed' 
                            ? 'bg-[#27AE60] border-transparent text-white' 
                            : 'border-[#2D2926]/10 text-[#2D2926]/10 hover:border-[#27AE60] hover:text-[#27AE60]'
                        }`}
                      >
                         <Receipt size={20} />
                      </button>
                      <button onClick={() => setDeleteId(log.id)} className="opacity-0 group-hover:opacity-100 transition-all text-[#2D2926]/10 hover:text-red-500">
                         <Trash2 size={18} />
                      </button>
                   </div>
                </div>
             </motion.div>
           );
         })}

         {logs.length === 0 && (
           <div className="py-32 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px] space-y-6">
              <Construction size={60} className="text-[#2D2926]/5 mx-auto" />
              <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-30 italic">No household tasks pending</p>
           </div>
         )}
      </div>
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteLog}
        title="Delete Record"
        message="Are you sure you want to remove this maintenance entry? This action is permanent."
      />
    </div>
  );
}
