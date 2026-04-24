import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Settings, 
  Users, 
  Wallet, 
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Edit2,
  Check,
  X as CloseIcon,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';

export default function Admin() {
  const [members, setMembers] = useState<any[]>([]);
  const [initialBalance, setInitialBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');

  useEffect(() => {
    // Real-time listener for users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch current wallet
    const fetchWallet = async () => {
      const walletDoc = await getDoc(doc(db, 'metadata', 'wallet'));
      if (walletDoc.exists()) {
        setCurrentBalance(walletDoc.data().balance || 0);
      }
    };
    fetchWallet();

    return () => unsubscribeUsers();
  }, []);

  const handleSetBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialBalance || isNaN(parseFloat(initialBalance))) return;

    try {
      await setDoc(doc(db, 'metadata', 'wallet'), {
        balance: parseFloat(initialBalance),
        lastReset: new Date().toISOString()
      });
      setCurrentBalance(parseFloat(initialBalance));
      setInitialBalance('');
      showToast("Initial balance has been set successfully!", "success");
    } catch (error) {
      console.error("Error setting balance", error);
      showToast("Failed to set balance.", "error");
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showToast(`Role updated to ${newRole}`, "success");
    } catch (error) {
      showToast("Failed to update role", "error");
    }
  };

  const updateNickname = async (userId: string) => {
    if (!editNickname.trim()) return;
    try {
      await updateDoc(doc(db, 'users', userId), { nickname: editNickname });
      setEditingId(null);
      showToast("Nickname updated", "success");
    } catch (error) {
      showToast("Failed to update nickname", "error");
    }
  };

  return (
    <div className="space-y-16 pb-20">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">System Control</p>
        <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
          Admin Panel.
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Funds Initialization */}
        <section className="space-y-8">
           <div className="flex items-center gap-4 border-b border-[#2D2926]/10 pb-4">
              <Wallet size={20} className="text-[#A67C52]" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Funds Management</h2>
           </div>

           <div className="bg-white p-10 rounded-[40px] border border-[#2D2926]/5 shadow-sm space-y-8">
              <div>
                 <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mb-2">Current Treasure</p>
                 <p className="text-4xl font-serif italic text-[#1A1A1A]">₹{currentBalance.toLocaleString('en-IN')}</p>
              </div>

              <form onSubmit={handleSetBalance} className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Set Initial Balance</label>
                    <input
                      type="number"
                      placeholder="Enter total amount on hand..."
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      className="w-full bg-[#F5F1EA] border-none rounded-2xl p-5 text-lg font-bold outline-none focus:ring-2 ring-[#2D2926]/10 transition-all"
                    />
                 </div>
                 <button 
                  type="submit"
                  className="w-full py-4 bg-[#2D2926] text-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-all shadow-xl"
                 >
                   Update Global Balance
                 </button>
              </form>
           </div>
        </section>

        {/* Family Members Management */}
        <section className="space-y-8">
           <div className="flex items-center gap-4 border-b border-[#2D2926]/10 pb-4">
              <Users size={20} className="text-[#A67C52]" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Family Members</h2>
           </div>

           <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="bg-white p-6 rounded-[30px] border border-[#2D2926]/5 space-y-6 group">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#2D2926]/5">
                            {member.photoURL ? (
                              <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#2D2926] flex items-center justify-center text-white font-serif text-lg">
                                {member.displayName?.charAt(0)}
                              </div>
                            )}
                        </div>
                        <div>
                           {editingId === member.id ? (
                             <div className="flex items-center gap-2">
                                <input 
                                  value={editNickname}
                                  onChange={(e) => setEditNickname(e.target.value)}
                                  placeholder="Set Nickname..."
                                  className="bg-[#F5F1EA] border-none rounded-lg px-3 py-1 text-sm font-bold outline-none"
                                  autoFocus
                                />
                                <button onClick={() => updateNickname(member.id)} className="text-emerald-500 hover:scale-110 transition-all">
                                   <Check size={16} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="text-rose-500 hover:scale-110 transition-all">
                                   <CloseIcon size={16} />
                                </button>
                             </div>
                           ) : (
                             <div className="flex items-center gap-3">
                                <p className="text-sm font-bold text-[#1A1A1A]">{member.nickname || member.displayName}</p>
                                <button 
                                  onClick={() => {
                                    setEditingId(member.id);
                                    setEditNickname(member.nickname || member.displayName || '');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-[#2D2926]/20 hover:text-[#2D2926] transition-all"
                                >
                                   <Edit2 size={12} />
                                </button>
                             </div>
                           )}
                           <p className="text-[9px] uppercase tracking-widest font-black text-[#A67C52] italic">{member.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                         <div className="text-right">
                            <p className={`text-[8px] uppercase tracking-[0.2em] font-black ${member.role === 'admin' ? 'text-emerald-500' : 'text-slate-300'}`}>
                               {member.role}
                            </p>
                         </div>
                         <button 
                           onClick={() => toggleRole(member.id, member.role)}
                           className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                             member.role === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300 hover:bg-[#2D2926] hover:text-white'
                           }`}
                           title="Toggle Admin Role"
                         >
                            <ShieldCheck size={18} />
                         </button>
                      </div>
                   </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-[#2D2926]/5 rounded-[30px]">
                   <p className="text-[10px] uppercase tracking-widest font-bold opacity-20 italic">Scanning for family nodes...</p>
                </div>
              )}
           </div>
        </section>
      </div>

      <footer className="pt-12 border-t border-[#2D2926]/10 text-[10px] uppercase tracking-widest font-bold opacity-30 italic">
        "With great power (Admin), comes great responsibility (Dishes)."
      </footer>
    </div>
  );
}
