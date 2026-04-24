import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { sendNotification } from '../components/NotificationManager';
import { 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Calendar as CalendarIcon,
  User,
  RefreshCcw,
  ArrowRight,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const RECURRENCE_OPTIONS = [
  { id: 'none', label: 'One-time' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('All');
  const { showToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('status', 'asc'), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const fetchUsers = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      setFamilyMembers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      await addDoc(collection(db, 'tasks'), {
        title,
        description,
        recurrence,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        assignedTo,
        status: 'pending',
        createdBy: user?.displayName || 'Unknown',
        lastUpdated: new Date().toISOString()
      });
      setTitle('');
      setDescription('');
      setIsAdding(false);
      showToast("Task added successfully!");
      
      const authorName = (useAuth().userData?.nickname || user?.displayName || 'Someone');
      sendNotification(user?.uid || '', authorName, `Added a new task: ${title}`);
    } catch (error) {
      console.error("Error adding task", error);
      showToast("Failed to add task", "error");
    }
  };

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      await updateDoc(doc(db, 'tasks', task.id), { 
        status: newStatus,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
       console.error("Error updating status", error);
    }
  };

  const deleteTask = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'tasks', deleteId));
      showToast("Task removed from list");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting task", error);
      showToast("Failed to remove task", "error");
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Chores & Tasks</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Home Chores.
          </h1>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-fit py-3 px-8 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all flex items-center gap-3 ${
            isAdding 
              ? 'bg-[#2D2926] text-[#FDFBF7]' 
              : 'bg-[#E67E22] text-white hover:scale-105 shadow-xl shadow-[#E67E22]/20'
          }`}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          <span>{isAdding ? 'Close' : 'Add New Task'}</span>
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
              onSubmit={handleAddTask}
              className="bg-white p-10 rounded-[40px] border border-[#2D2926]/10 space-y-10 shadow-2xl"
            >
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Water the Garden, Clean AC Filters..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-3xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs uppercase tracking-widest outline-none focus:border-[#2D2926]"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Repeat</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="w-full h-[58px] px-4 rounded-2xl border border-[#2D2926]/10 bg-white font-bold text-xs uppercase tracking-widest outline-none appearance-none"
                  >
                    {RECURRENCE_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Assign To</label>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {['All', ...familyMembers.map(m => m.nickname || m.displayName)].map(node => (
                    <button
                      key={node}
                      type="button"
                      onClick={() => setAssignedTo(node)}
                      className={`flex-shrink-0 flex items-center justify-center gap-3 px-8 py-4 rounded-full border transition-all ${
                        assignedTo === node 
                          ? 'bg-[#2D2926] text-[#FDFBF7] border-transparent' 
                          : 'bg-white border-[#2D2926]/5 text-[#2D2926]/40 hover:border-[#2D2926]'
                      }`}
                    >
                      <User size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{node}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10 flex items-center justify-center gap-3"
              >
                Add Task <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-12">
        {/* Active Tasks */}
        <section className="space-y-8">
          <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
             <h2 className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-3">
               Ongoing Tasks
               <span className="text-[10px] font-serif italic text-[#E67E22]">({pendingTasks.length})</span>
             </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {pendingTasks.map((task) => (
               <motion.div 
                 key={task.id}
                 layout
                 className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden"
               >
                 <div className="flex justify-between items-start mb-6">
                    <button 
                      onClick={() => toggleStatus(task)}
                      className="w-10 h-10 rounded-full border border-[#2D2926]/10 flex items-center justify-center text-[#2D2926]/10 hover:text-[#27AE60] hover:border-[#27AE60] transition-all"
                    >
                      <Square size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                       {task.recurrence !== 'none' && <RefreshCcw size={14} className="text-[#2D2926]/20" />}
                       <button onClick={() => setDeleteId(task.id)} className="opacity-0 group-hover:opacity-100 transition-all text-[#2D2926]/10 hover:text-red-500">
                          <Trash2 size={16} />
                       </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] leading-tight group-hover:text-[#E67E22] transition-colors">{task.title}</h3>
                    <div className="flex flex-wrap gap-3">
                       <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold opacity-30">
                          <CalendarIcon size={12} />
                          {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                       </div>
                       <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold text-[#A67C52]">
                          <User size={12} />
                          {task.assignedTo}
                       </div>
                    </div>
                 </div>

                 <div className="absolute bottom-0 left-0 h-1 bg-[#E67E22] w-0 group-hover:w-full transition-all duration-700"></div>
               </motion.div>
             ))}

             {pendingTasks.length === 0 && (
               <div className="col-span-full py-20 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px] space-y-4">
                  <AlertCircle size={40} className="text-[#2D2926]/10 mx-auto" />
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">No active chores</p>
               </div>
             )}
          </div>
        </section>

        {/* Recently Completed */}
        {completedTasks.length > 0 && (
          <section className="space-y-8 opacity-50">
            <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
               <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Done</h2>
            </div>
            <div className="flex flex-wrap gap-4">
               {completedTasks.map((task) => (
                 <div key={task.id} className="bg-[#2D2926]/5 px-6 py-3 rounded-full flex items-center gap-4 group">
                    <button onClick={() => toggleStatus(task)} className="text-[#27AE60]">
                       <CheckSquare size={16} />
                    </button>
                    <span className="text-xs font-bold uppercase tracking-widest italic line-through">{task.title}</span>
                    <button onClick={() => setDeleteId(task.id)} className="opacity-0 group-hover:opacity-100 text-red-500/40">
                       <X size={14} />
                    </button>
                 </div>
               ))}
            </div>
          </section>
        )}
      </div>
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteTask}
        title="Delete Task"
        message="Are you sure you want to remove this chore? This action cannot be undone."
      />
    </div>
  );
}
