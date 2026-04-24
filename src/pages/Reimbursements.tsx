import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { sendNotification } from '../components/NotificationManager';
import { 
  Plus, 
  ReceiptIndianRupee, 
  Clock, 
  CheckCircle, 
  X,
  User as UserIcon,
  ChevronDown,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Reimbursements() {
  const { user, role } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  const [deleteClaimData, setDeleteClaimData] = useState<any | null>(null);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [splits, setSplits] = useState<{ item: string; amount: string }[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'reimbursements'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClaims(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const fetchUsers = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      setFamilyMembers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();

    return () => unsubscribe();
  }, []);

  const addSplit = () => setSplits([...splits, { item: '', amount: '' }]);
  const removeSplit = (index: number) => setSplits(splits.filter((_, i) => i !== index));
  const updateSplit = (index: number, field: string, value: string) => {
    const newSplits = [...splits];
    (newSplits[index] as any)[field] = value;
    setSplits(newSplits);
    
    // Auto-update total amount
    const total = newSplits.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
    if (total > 0) setAmount(total.toString());
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !assignedTo) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    try {
      await addDoc(collection(db, 'reimbursements'), {
        amount: parseFloat(amount),
        description,
        assignedTo,
        splits: splits.filter(s => s.item && s.amount),
        userId: user?.uid,
        userName: user?.displayName,
        date: new Date().toISOString(),
        status: 'pending'
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setAssignedTo('');
      setSplits([]);
      showToast("Reimbursement claim created!");
      
      const authorName = (useAuth().userData?.nickname || user?.displayName || 'Someone');
      sendNotification(user?.uid || '', authorName, `Created a claim for ₹${amount}: ${description}`);
    } catch (error) {
       console.error("Error submitting claim", error);
       showToast("Failed to create claim", "error");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'reimbursements', id), { status: newStatus });
      showToast(newStatus === 'reimbursed' ? "Claim approved and paid!" : "Status updated!");
      
      if (newStatus === 'reimbursed') {
        const adminName = (useAuth().userData?.nickname || user?.displayName || 'Admin');
        sendNotification(user?.uid || '', adminName, `Paid a reimbursement claim!`);
      }
    } catch (error) {
      console.error("Error updating claim status", error);
    }
  };

  const deleteClaim = async () => {
    if (!deleteClaimData) return;
    try {
      await deleteDoc(doc(db, 'reimbursements', deleteClaimData.id));
      showToast("Claim record removed.");
      setDeleteClaimData(null);
    } catch (error) {
      console.error("Error deleting claim", error);
      showToast("Failed to remove claim", "error");
    }
  };

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const totalPending = pendingClaims.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-16 pb-20">

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Money Tracker</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Reimbursements.
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-fit py-3 px-8 bg-[#2D2926] text-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform shadow-xl shadow-[#2D2926]/20"
        >
          New Claim
        </button>
      </header>

      {/* Summary */}
      <div className="bg-white p-10 rounded-[40px] border border-[#2D2926]/5 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
         <div className="flex items-center gap-8 relative z-10">
            <div className="w-16 h-16 bg-[#F5F1EA] text-[#A67C52] rounded-full flex items-center justify-center border border-[#2D2926]/5">
               <ReceiptIndianRupee size={28} />
            </div>
            <div>
               <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 mb-2">Total To Be Paid</p>
               <p className="text-4xl font-serif italic text-[#1A1A1A]">₹{totalPending.toLocaleString('en-IN')}</p>
            </div>
         </div>
         <div className="bg-[#2D2926] text-[#FDFBF7] px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest">
            {pendingClaims.length} Active Requests
         </div>
      </div>

      <div className="space-y-10">
        <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
           <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#2D2926]">History</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {claims.map((claim) => (
            <motion.div 
               key={claim.id}
               layout
               className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm hover:shadow-xl transition-all duration-500 group"
            >
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                 <div className="flex items-center gap-8 flex-1">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border border-[#2D2926]/10 transition-colors ${claim.status === 'reimbursed' ? 'bg-emerald-500 text-white border-transparent' : 'bg-white text-[#A67C52]'}`}>
                       {claim.status === 'reimbursed' ? <CheckCircle size={24} /> : <Clock size={24} />}
                    </div>
                    <div className="min-w-0">
                       <p className="text-2xl font-serif italic tracking-tight text-[#1A1A1A] group-hover:text-[#A67C52] transition-colors">{claim.description}</p>
                       <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-30 mt-2 italic">
                          <span className="not-italic bg-[#2D2926] text-white px-3 py-1 rounded-full text-[8px] opacity-100">{claim.assignedTo}</span>
                          <span>By {claim.userName}</span>
                          <span>•</span>
                          <span>{new Date(claim.date).toLocaleDateString('en-IN')}</span>
                       </div>
                    </div>
                 </div>

                 <div className="text-right flex items-center justify-end gap-8 border-t md:border-t-0 md:border-l border-[#2D2926]/5 pt-6 md:pt-0 md:pl-8">
                    <div className="space-y-2">
                      <p className={`text-3xl font-serif italic ${claim.status === 'reimbursed' ? 'text-slate-300 line-through' : 'text-[#1A1A1A]'}`}>₹{claim.amount.toLocaleString('en-IN')}</p>
                      {claim.status === 'pending' && role === 'admin' ? (
                         <button 
                          onClick={() => updateStatus(claim.id, 'reimbursed')}
                          className="px-6 py-2 bg-[#2D2926] text-white rounded-full text-[9px] font-bold uppercase tracking-widest hover:scale-105 transition-all"
                         >
                           Pay Now
                         </button>
                      ) : (
                        <p className={`text-[9px] font-bold uppercase tracking-[0.3em] ${claim.status === 'reimbursed' ? 'text-emerald-500' : 'text-orange-500'} italic`}>
                           {claim.status === 'reimbursed' ? 'Paid' : 'Pending'}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setDeleteClaimData(claim)} className="opacity-0 group-hover:opacity-100 transition-all p-3 text-red-500/20 hover:text-red-500">
                       <X size={20} />
                    </button>
                 </div>
               </div>

               {/* Split Up Details */}
               {claim.splits && claim.splits.length > 0 && (
                 <div className="mt-8 pt-8 border-t border-dashed border-[#2D2926]/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {claim.splits.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-[#FDFBF7] p-4 rounded-2xl border border-[#2D2926]/5">
                         <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{s.item}</span>
                         <span className="text-xs font-serif italic font-bold">₹{parseFloat(s.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                 </div>
               )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#2D2926]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-[calc(100%-2rem)] max-w-[400px] bg-[#FDFBF7] border border-[#2D2926]/10 rounded-[40px] shadow-2xl overflow-hidden relative z-[100] max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              <div className="p-10 space-y-10">
                <header className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2">New Entry</p>
                    <h2 className="text-3xl font-serif italic text-[#1A1A1A]">Create Claim.</h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full border border-[#2D2926]/10 flex items-center justify-center hover:bg-[#2D2926] hover:text-[#FDFBF7] transition-all">
                    <X size={18} />
                  </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Assign To</label>
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full h-[60px] px-6 rounded-2xl border border-[#2D2926]/10 bg-white font-bold text-xs uppercase tracking-widest outline-none appearance-none"
                        required
                      >
                        <option value="">Select Member</option>
                        {familyMembers.map(m => (
                          <option key={m.id} value={m.nickname || m.displayName}>{m.nickname || m.displayName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Total Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-[60px] px-6 rounded-2xl border border-[#2D2926]/10 bg-white text-xl font-serif italic outline-none focus:border-[#2D2926]"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Description</label>
                    <input 
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-5 text-sm outline-none focus:border-[#2D2926] font-medium"
                      placeholder="What was this for?"
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Item Split-up (Optional)</label>
                       <button type="button" onClick={addSplit} className="text-[9px] uppercase font-black text-[#A67C52] flex items-center gap-2 hover:underline">
                          <Plus size={12} /> Add Item
                       </button>
                    </div>
                    <div className="space-y-3">
                       {splits.map((split, index) => (
                         <div key={index} className="flex gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-300">
                            <input
                              placeholder="Item name"
                              value={split.item}
                              onChange={(e) => updateSplit(index, 'item', e.target.value)}
                              className="flex-1 bg-white border border-[#2D2926]/5 rounded-xl p-3 text-xs outline-none focus:border-[#2D2926]"
                            />
                            <input
                              type="number"
                              placeholder="₹"
                              value={split.amount}
                              onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                              className="w-24 bg-white border border-[#2D2926]/5 rounded-xl p-3 text-xs outline-none focus:border-[#2D2926]"
                            />
                            <button type="button" onClick={() => removeSplit(index)} className="text-red-300 hover:text-red-500 transition-colors">
                               <Trash2 size={16} />
                            </button>
                         </div>
                       ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10"
                  >
                    Create Claim
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={!!deleteClaimData}
        onClose={() => setDeleteClaimData(null)}
        onConfirm={deleteClaim}
        title="Remove Claim"
        message="Are you sure you want to remove this reimbursement claim? This action is permanent."
      />
    </div>
  );
}
