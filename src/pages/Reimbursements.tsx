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
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { 
  Plus, 
  ReceiptIndianRupee, 
  Clock, 
  CheckCircle, 
  History,
  X,
  User as UserIcon,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Reimbursements() {
  const { user, role } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // Admins see all, members see all (shared visibility for transparency)
    const q = query(collection(db, 'reimbursements'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClaims(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      await addDoc(collection(db, 'reimbursements'), {
        amount: parseFloat(amount),
        description,
        userId: user?.uid,
        userName: user?.displayName,
        date: new Date().toISOString(),
        status: 'pending'
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
    } catch (error) {
       console.error("Error submitting claim", error);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (role !== 'admin') {
      alert("Only Admins can mark as reimbursed.");
      return;
    }
    try {
      await updateDoc(doc(db, 'reimbursements', id), { status: newStatus });
    } catch (error) {
      console.error("Error updating claim status", error);
    }
  };

  const deleteClaim = async (claim: any) => {
    if (claim.status === 'reimbursed' && role !== 'admin') return;
    if (!confirm("Delete this claim?")) return;
    try {
      await deleteDoc(doc(db, 'reimbursements', claim.id));
    } catch (error) {
      console.error("Error deleting claim", error);
    }
  };

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const totalPending = pendingClaims.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Claims Ledger</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Reimbursement Hub.
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-fit py-3 px-8 bg-[#2D2926] text-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform"
        >
          Initiate New Claim
        </button>
      </header>

      {/* Summary Registry */}
      <div className="bg-white/40 backdrop-blur rounded-[40px] border border-[#2D2926]/5 p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <ReceiptIndianRupee size={120} />
         </div>
         <div className="flex items-center gap-8 relative z-10">
            <div className="w-16 h-16 bg-[#F5F1EA] text-[#A67C52] rounded-full flex items-center justify-center border border-[#2D2926]/5">
               <ReceiptIndianRupee size={28} />
            </div>
            <div>
               <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 mb-2">Total Outstanding Balance</p>
               <p className="text-4xl font-serif italic text-[#1A1A1A]">₹{totalPending.toLocaleString('en-IN')}</p>
            </div>
         </div>
         <div className="flex gap-4 relative z-10">
            <div className="bg-[#2D2926] text-[#FDFBF7] px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">
               {pendingClaims.length} Active Requests
            </div>
         </div>
      </div>

      <div className="space-y-10">
        <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
           <h2 className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-3 text-[#2D2926]">
             Recent Claims
           </h2>
        </div>

        <div className="space-y-6">
          {claims.map((claim) => (
            <motion.div 
               key={claim.id}
               layout
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
            >
               <div className="flex items-center gap-8 flex-1">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border border-[#2D2926]/10 transition-colors ${claim.status === 'reimbursed' ? 'bg-[#27AE60] text-white border-transparent' : 'bg-white text-[#A67C52] group-hover:border-[#A67C52]'}`}>
                     {claim.status === 'reimbursed' ? <CheckCircle size={24} /> : <Clock size={24} />}
                  </div>
                  <div className="min-w-0">
                     <p className="text-xl font-serif italic tracking-tight text-[#1A1A1A] group-hover:text-[#A67C52] transition-colors truncate">{claim.description}</p>
                     <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-30 mt-1 italic">
                        <span className="font-sans not-italic text-[#2D2926] opacity-100">{claim.userName}</span>
                        <span>•</span>
                        <span>{new Date(claim.date).toLocaleDateString('en-IN')}</span>
                     </div>
                  </div>
               </div>

               <div className="text-right flex items-center justify-end gap-8">
                  <div className="space-y-2">
                    <p className={`text-2xl font-serif italic ${claim.status === 'reimbursed' ? 'text-slate-300 line-through' : 'text-[#1A1A1A]'}`}>₹{claim.amount.toLocaleString('en-IN')}</p>
                    {claim.status === 'pending' && role === 'admin' ? (
                       <button 
                        onClick={() => updateStatus(claim.id, 'reimbursed')}
                        className="text-[10px] font-bold text-[#A67C52] uppercase tracking-[0.2em] hover:underline underline-offset-4 decoration-2"
                       >
                         Approve
                       </button>
                    ) : (
                      <p className={`text-[9px] font-bold uppercase tracking-[0.3em] ${claim.status === 'reimbursed' ? 'text-emerald-500' : 'text-orange-500'} italic`}>
                         {claim.status}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deleteClaim(claim)} className="opacity-0 group-hover:opacity-100 transition-all p-3 text-red-100 hover:text-red-500 bg-red-50 rounded-full">
                     <X size={20} />
                  </button>
               </div>
            </motion.div>
          ))}
          {claims.length === 0 && (
            <div className="py-24 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px]">
               <ShieldCheck size={48} className="mx-auto mb-6 opacity-5" />
               <p className="text-[10px] uppercase tracking-widest font-bold opacity-30">No fiscal requests in history</p>
            </div>
          )}
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
              className="w-full max-w-xl bg-[#FDFBF7] border border-[#2D2926]/10 rounded-[40px] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-10 space-y-10">
                <header className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2">Claim Entry</p>
                    <h2 className="text-3xl font-serif italic text-[#1A1A1A]">Initiate Request.</h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full border border-[#2D2926]/10 flex items-center justify-center hover:bg-[#2D2926] hover:text-[#FDFBF7] transition-all">
                    <X size={18} />
                  </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="relative border-b-2 border-[#2D2926]/10 pb-4 focus-within:border-[#2D2926] transition-colors">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block mb-2 text-center">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent text-6xl font-serif italic outline-none text-[#1A1A1A] text-center"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Narrative Context</label>
                    <textarea 
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-6 text-sm outline-none focus:border-[#2D2926] transition-colors font-medium resize-none min-h-[140px] placeholder:text-[#2D2926]/20"
                      placeholder="Discuss the reason for this reimbursement claim..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10"
                  >
                    Commit Request to Hub
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
