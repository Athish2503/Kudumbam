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
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { 
  Shirt, 
  ChevronRight, 
  Plus, 
  X, 
  CheckCircle2, 
  Clock, 
  Trash2,
  Calendar,
  IndianRupee,
  PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';

const ITEM_TYPES = [
  { id: 'shirts', label: 'Shirts' },
  { id: 'pants', label: 'Pants' },
  { id: 'tshirts', label: 'T-Shirts' },
  { id: 'sarees', label: 'Sarees' },
  { id: 'dresses', label: 'Dresses' },
  { id: 'others', label: 'Others' },
];

export default function Laundry() {
  const { user, userData } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Form State
  const [counts, setCounts] = useState<Record<string, number>>({
    shirts: 0, pants: 0, tshirts: 0, sarees: 0, dresses: 0, others: 0
  });
  const [totalCost, setTotalCost] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'laundry_batches'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleIncrement = (id: string) => {
    setCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleDecrement = (id: string) => {
    setCounts(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalItems === 0) {
      showToast("Please add at least one item", "error");
      return;
    }

    try {
      const batchData = {
        counts,
        totalItems,
        totalCost: parseFloat(totalCost) || 0,
        notes,
        status: 'sent',
        date: new Date().toISOString(),
        createdBy: user?.uid,
        createdByName: userData?.nickname || user?.displayName || 'Unknown'
      };

      await addDoc(collection(db, 'laundry_batches'), batchData);
      
      // Reset form
      setIsModalOpen(false);
      setCounts({ shirts: 0, pants: 0, tshirts: 0, sarees: 0, dresses: 0, others: 0 });
      setTotalCost('');
      setNotes('');
      showToast("Laundry batch recorded!");
    } catch (error) {
      console.error(error);
      showToast("Failed to record batch", "error");
    }
  };

  const markReceived = async (batch: any) => {
    try {
      await runTransaction(db, async (transaction) => {
        const batchRef = doc(db, 'laundry_batches', batch.id);
        const walletRef = doc(db, 'metadata', 'wallet');
        
        // READS FIRST
        const walletDoc = await transaction.get(walletRef);

        // WRITES SECOND
        transaction.update(batchRef, { 
          status: 'received',
          receivedDate: new Date().toISOString()
        });

        if (batch.totalCost > 0) {
          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            amount: batch.totalCost,
            category: 'utilities',
            description: `Laundry: ${batch.totalItems} items (${batch.notes || 'No notes'})`,
            userId: user?.uid,
            userName: userData?.nickname || user?.displayName || 'Unknown',
            date: new Date().toISOString(),
            type: 'expense'
          });

          if (walletDoc.exists()) {
            const currentBalance = walletDoc.data().balance || 0;
            transaction.update(walletRef, { balance: currentBalance - batch.totalCost });
          }
        }
      });

      showToast("Laundry received and budget updated!");
    } catch (error) {
      console.error(error);
      showToast("Failed to update status", "error");
    }
  };

  const deleteBatch = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteDoc(doc(db, 'laundry_batches', id));
        showToast("Record deleted");
      } catch (error) {
        showToast("Failed to delete", "error");
      }
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Ironing & Laundry</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Laundry.
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-12 h-12 bg-[#2D2926] text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#2D2926]/10 pb-4">
           <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Recent Batches</h2>
        </div>

        <div className="space-y-6">
          {batches.map((batch) => (
            <motion.div 
              layout
              key={batch.id}
              className={`bg-white rounded-[32px] p-6 border border-[#2D2926]/5 shadow-sm space-y-4 ${batch.status === 'received' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${batch.status === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Shirt size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A]">{batch.totalItems} Items for Ironing</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 italic">
                      {format(new Date(batch.date), 'MMM d, h:mm a')} • {batch.createdByName}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => deleteBatch(batch.id)} className="p-2 text-rose-500/20 hover:text-rose-500 transition-colors">
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(batch.counts).map(([key, val]: [string, any]) => val > 0 && (
                  <div key={key} className="px-3 py-1 bg-[#FDFBF7] border border-[#2D2926]/5 rounded-full text-[9px] font-bold uppercase tracking-widest text-[#2D2926]/40">
                    {val} {key}
                  </div>
                ))}
              </div>

              {batch.notes && (
                <p className="text-xs text-[#2D2926]/60 italic font-medium">"{batch.notes}"</p>
              )}

              <div className="pt-4 border-t border-[#2D2926]/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IndianRupee size={12} className="opacity-30" />
                  <span className="text-sm font-serif italic font-black">₹{batch.totalCost}</span>
                </div>
                
                {batch.status === 'sent' ? (
                  <button 
                    onClick={() => markReceived(batch)}
                    className="flex items-center gap-2 bg-[#2D2926] text-[#FDFBF7] px-4 py-2 rounded-full text-[9px] uppercase tracking-widest font-black shadow-lg shadow-[#2D2926]/10 active:scale-95 transition-all"
                  >
                    <PackageCheck size={14} />
                    Mark Received
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 size={14} />
                    <span className="text-[9px] uppercase tracking-widest font-black">Received</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {batches.length === 0 && !loading && (
            <div className="py-20 text-center border-2 border-dashed border-[#2D2926]/5 rounded-[40px]">
               <p className="text-[10px] uppercase tracking-widest font-black opacity-20">No laundry batches found</p>
            </div>
          )}
        </div>
      </section>

      {/* New Batch Modal */}
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
              className="w-full max-w-[400px] bg-[#FDFBF7] rounded-[40px] shadow-2xl overflow-hidden relative z-[100] max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmit} className="p-8 space-y-10">
                <header className="flex justify-between items-center">
                  <h2 className="text-3xl font-serif italic font-black">New Batch.</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 opacity-20"><X /></button>
                </header>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {ITEM_TYPES.map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-3xl border border-[#2D2926]/5 space-y-3">
                         <p className="text-[8px] uppercase tracking-widest font-black opacity-30 text-center">{item.label}</p>
                         <div className="flex items-center justify-between">
                            <button type="button" onClick={() => handleDecrement(item.id)} className="w-8 h-8 rounded-full bg-[#FDFBF7] flex items-center justify-center hover:bg-[#2D2926] hover:text-white transition-all"><Trash2 size={12}/></button>
                            <span className="text-xl font-serif italic font-black">{counts[item.id] || 0}</span>
                            <button type="button" onClick={() => handleIncrement(item.id)} className="w-8 h-8 rounded-full bg-[#FDFBF7] flex items-center justify-center hover:bg-[#2D2926] hover:text-white transition-all"><Plus size={12}/></button>
                         </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] uppercase tracking-widest font-black opacity-30">Estimated Cost (₹)</label>
                     <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                        <input 
                          type="number"
                          value={totalCost}
                          onChange={(e) => setTotalCost(e.target.value)}
                          className="w-full bg-[#FDFBF7] border border-[#2D2926]/5 rounded-2xl p-5 pl-12 text-lg font-serif italic font-black outline-none focus:border-[#2D2926]/20 transition-all"
                          placeholder="0.00"
                        />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] uppercase tracking-widest font-black opacity-30">Notes</label>
                     <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-[#FDFBF7] border border-[#2D2926]/5 rounded-2xl p-4 text-sm outline-none focus:border-[#2D2926]/20 transition-all"
                        placeholder="Any special instructions?"
                        rows={2}
                     />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] rounded-full text-[10px] uppercase tracking-[0.3em] font-black shadow-xl shadow-[#2D2926]/20 active:scale-95 transition-all"
                >
                  Send to Laundry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
