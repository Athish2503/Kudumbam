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
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  ShoppingCart,
  Tags,
  Search,
  MoreVertical,
  FlaskConical,
  Sprout,
  Package,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'staples', label: 'Staples', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'spices', label: 'Spices', icon: FlaskConical, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'vegetables', label: 'Veggies', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'others', label: 'Others', icon: Tags, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export default function Groceries() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('staples');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('kg');

  useEffect(() => {
    const q = query(collection(db, 'groceries'), orderBy('status', 'desc'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    try {
      await addDoc(collection(db, 'groceries'), {
        name: newItemName,
        category: newItemCategory,
        quantity: parseFloat(newItemQty),
        unit: newItemUnit,
        status: 'pending',
        lastUpdated: new Date().toISOString()
      });
      setNewItemName('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding grocery", error);
    }
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === 'pending' ? 'purchased' : 'pending';
    try {
      await updateDoc(doc(db, 'groceries', item.id), { 
        status: newStatus,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
       console.error("Error updating status", error);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Remove this item from list?")) return;
    try {
      await deleteDoc(doc(db, 'groceries', id));
    } catch (error) {
      console.error("Error deleting item", error);
    }
  };

  const pendingItems = items.filter(i => i.status === 'pending');
  const purchasedItems = items.filter(i => i.status === 'purchased');

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Provision Registry</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Pantry Nodes.
          </h1>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-fit py-3 px-8 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all flex items-center gap-3 ${
            isAdding 
              ? 'bg-[#2D2926] text-[#FDFBF7] rotate-0' 
              : 'bg-[#A67C52] text-white hover:scale-105 shadow-xl shadow-[#A67C52]/20'
          }`}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          <span>{isAdding ? 'Close Registry' : 'Append Item'}</span>
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
              onSubmit={handleAddItem}
              className="bg-white/40 backdrop-blur rounded-[40px] border border-[#2D2926]/10 p-10 space-y-10"
            >
              <div className="flex flex-col md:flex-row gap-8">
                 <div className="flex-1 space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Item Specification</label>
                    <input
                      type="text"
                      placeholder="e.g. Tamarind, Palakkad Matta Rice..."
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full bg-transparent text-3xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                      autoFocus
                      required
                    />
                 </div>
                <div className="flex gap-4">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block text-center">Qty</label>
                    <input
                      type="number"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="w-24 bg-white border border-[#2D2926]/10 rounded-2xl p-4 text-center font-bold text-lg outline-none focus:border-[#2D2926]"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block text-center">Unit</label>
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="h-[60px] px-4 rounded-2xl border border-[#2D2926]/10 bg-white font-bold text-xs uppercase tracking-widest outline-none appearance-none"
                    >
                      <option value="kg">kg</option>
                      <option value="ltr">ltr</option>
                      <option value="pkts">pkts</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Classification</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewItemCategory(cat.id)}
                      className={`flex items-center justify-center gap-3 p-5 rounded-2xl border transition-all ${
                        newItemCategory === cat.id 
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

              <button 
                type="submit"
                className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10 flex items-center justify-center gap-3"
              >
                Commit to Registry <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Pending List */}
        <section className="space-y-10">
          <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
             <h2 className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-3">
               Needs Purchase 
               <span className="text-[10px] font-serif italic text-[#A67C52] opacity-100">({pendingItems.length} entries)</span>
             </h2>
          </div>
          
          <div className="space-y-6">
             {pendingItems.map((item) => (
               <motion.div 
                 key={item.id}
                 layout
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white p-6 rounded-[40px] border border-[#2D2926]/5 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all duration-500"
               >
                 <div className="flex items-center gap-6">
                    <button 
                      onClick={() => toggleStatus(item)} 
                      className="w-12 h-12 rounded-full border border-[#2D2926]/10 flex items-center justify-center text-[#2D2926]/10 hover:text-[#27AE60] hover:border-[#27AE60] transition-all"
                    >
                       <div className="w-4 h-4 rounded-full border-2 border-inherit"></div>
                    </button>
                    <div>
                       <p className="text-lg font-serif italic tracking-tight text-[#1A1A1A] group-hover:text-[#A67C52] transition-colors">{item.name}</p>
                       <p className="text-[9px] uppercase tracking-widest font-bold opacity-30 mt-1 italic">
                        {item.quantity} {item.unit} • {CATEGORIES.find(c => c.id === item.category)?.label}
                       </p>
                    </div>
                 </div>
                 <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 transition-all p-3 text-[#2D2926]/10 hover:text-red-500 bg-red-50 rounded-full">
                    <Trash2 size={18} />
                 </button>
               </motion.div>
             ))}
             {pendingItems.length === 0 && (
               <div className="py-20 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px] space-y-4">
                  <CheckCircle2 size={40} className="text-[#27AE60] mx-auto opacity-40" />
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Pantry is currently optimized</p>
               </div>
             )}
          </div>
        </section>

        {/* Purchased List */}
        <section className="space-y-10">
          <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
             <h2 className="text-xs uppercase tracking-[0.2em] font-bold opacity-40">Recently Procured</h2>
          </div>
          
          <div className="space-y-4 opacity-40">
             {purchasedItems.map((item) => (
               <motion.div 
                 key={item.id}
                 layout
                 className="bg-[#2D2926]/5 p-5 px-8 rounded-full flex items-center justify-between group grayscale hover:grayscale-0 transition-all"
               >
                 <div className="flex items-center gap-5">
                    <button onClick={() => toggleStatus(item)} className="text-[#27AE60]">
                       <div className="w-6 h-6 rounded-full border-2 border-[#27AE60] bg-[#27AE60]/10 flex items-center justify-center">
                          <CheckCircle2 size={14} />
                       </div>
                    </button>
                    <span className="text-sm font-medium text-[#2D2926] line-through italic">{item.name} <span className="text-[10px] not-italic opacity-40 ml-2">({item.quantity} {item.unit})</span></span>
                 </div>
                 <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500/40 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                 </button>
               </motion.div>
             ))}
             {purchasedItems.length === 0 && (
               <p className="text-center py-12 text-[10px] uppercase tracking-widest font-bold opacity-20 italic">No recent logistical entries</p>
             )}
          </div>
        </section>
      </div>
    </div>
  );
}
