import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  increment,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpCircle, 
  ArrowDownCircle,
  ArrowUpRight,
  ReceiptText,
  Building,
  UtilityPole,
  ShoppingCart,
  MoreVertical,
  X,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { id: 'utilities', label: 'Utilities', icon: UtilityPole },
  { id: 'rent_housing', label: 'Housing', icon: Building },
  { id: 'misc', label: 'Misc', icon: ReceiptText },
];

export default function Funds() {
  const { user, role } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('groceries');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const balanceUnsubscribe = onSnapshot(doc(db, 'metadata', 'wallet'), (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance);
      }
    });

    return () => {
      unsubscribe();
      balanceUnsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    const numAmount = parseFloat(amount);
    const multiplier = type === 'expense' ? -1 : 1;

    try {
      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'metadata', 'wallet');
        const walletDoc = await transaction.get(walletRef);

        if (!walletDoc.exists()) {
          transaction.set(walletRef, { balance: numAmount * multiplier });
        } else {
          const newBalance = (walletDoc.data().balance || 0) + (numAmount * multiplier);
          transaction.update(walletRef, { balance: newBalance });
        }

        const newTransRef = doc(collection(db, 'transactions'));
        transaction.set(newTransRef, {
          amount: numAmount,
          category,
          description,
          userId: user?.uid,
          userName: user?.displayName,
          date: new Date().toISOString(),
          type
        });
      });

      setIsModalOpen(false);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error("Transaction failed", error);
      alert("Failed to add transaction. Check your permissions.");
    }
  };

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Financial Ledger</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Master Registry.
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-fit py-3 px-8 bg-[#2D2926] text-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform"
        >
          Record Transaction
        </button>
      </header>

      {/* Balance Registry */}
      <section className="bg-white/40 backdrop-blur rounded-[40px] border border-[#2D2926]/5 p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-12 bg-[#2D2926]/10"></div>
        <div className="pt-8">
           <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#2D2926]/40 mb-6">Available Resources</p>
           <div className="text-8xl font-serif italic tracking-tighter text-[#1A1A1A] mb-4">
             ₹{balance.toLocaleString('en-IN')}
           </div>
           <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-30 italic">Current Treasury Balance</p>
        </div>
        <div className="mt-12 pt-8 border-t border-[#2D2926]/5 flex items-center justify-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60]"></span>
           <span className="text-[9px] uppercase tracking-widest font-bold opacity-40">Synced to Cloud Hub</span>
        </div>
      </section>

      {/* Transaction History */}
      <section className="space-y-10">
        <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
           <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Transaction History</h2>
           <div className="flex gap-4">
             <button className="text-[10px] uppercase font-bold text-[#A67C52] tracking-widest underline decoration-2 underline-offset-4">Recent</button>
             <button className="text-[10px] uppercase font-bold text-[#2D2926]/30 tracking-widest hover:text-[#2D2926] transition-colors">Archived</button>
           </div>
        </div>

        <div className="space-y-12">
          {transactions.length > 0 ? (
            <div className="divide-y divide-[#2D2926]/5">
              {transactions.map((tx) => (
                <div key={tx.id} className="py-6 flex items-center justify-between group hover:pl-2 transition-all">
                  <div className="flex items-center gap-8">
                    <div className={`w-14 h-14 rounded-full border border-[#2D2926]/10 flex items-center justify-center text-[#2D2926]/40 transition-all ${
                      tx.type === 'income' ? 'group-hover:bg-[#27AE60] group-hover:text-white group-hover:border-transparent' : 'group-hover:bg-[#2D2926] group-hover:text-white'
                    }`}>
                      {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ReceiptText size={20} />}
                    </div>
                    <div>
                      <p className="text-base font-bold tracking-tight text-[#1A1A1A]">{tx.description || tx.category}</p>
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mt-1 italic">
                        {tx.userName} • {tx.category} • {new Date(tx.date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-serif italic ${tx.type === 'income' ? 'text-[#27AE60]' : 'text-[#1A1A1A]'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px]">
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-30">No treasury movements recorded</p>
            </div>
          )}
        </div>
      </section>

      {/* Record Transaction Modal */}
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
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2">New Entry</p>
                    <h2 className="text-3xl font-serif italic text-[#1A1A1A]">Record Data.</h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full border border-[#2D2926]/10 flex items-center justify-center hover:bg-[#2D2926] hover:text-[#FDFBF7] transition-all">
                    <X size={18} />
                  </button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-10">
                  {/* Type Toggle */}
                  <div className="flex p-1 bg-[#2D2926]/5 rounded-full">
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all ${type === 'expense' ? 'bg-[#2D2926] text-[#FDFBF7]' : 'text-[#2D2926]/40 hover:text-[#2D2926]'}`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`flex-1 py-3 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all ${type === 'income' ? 'bg-[#2D2926] text-[#FDFBF7]' : 'text-[#2D2926]/40 hover:text-[#2D2926]'}`}
                    >
                      Income
                    </button>
                  </div>

                  <div className="space-y-8">
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
                       <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Category</label>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                              category === cat.id 
                                ? 'bg-[#2D2926] text-[#FDFBF7] border-transparent' 
                                : 'border-[#2D2926]/10 hover:border-[#2D2926] text-[#2D2926]/40'
                            }`}
                          >
                            <cat.icon size={20} />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">{cat.label}</span>
                          </button>
                        ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Narrative Description</label>
                      <input 
                        type="text"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-5 text-sm outline-none focus:border-[#2D2926] transition-colors placeholder:text-[#2D2926]/20"
                        placeholder="Purpose of this transaction..."
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10"
                  >
                    Commit to Ledger
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
