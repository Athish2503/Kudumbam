import React, { useState, useEffect, useCallback } from 'react';
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
  ShoppingCart,
  Tags,
  Search,
  FlaskConical,
  Sprout,
  Package,
  X,
  AlertTriangle,
  Minus,
  ArrowUpCircle,
  Milk,
  Flame,
  ChefHat,
  Zap,
  Square,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = [
  { id: 'staples', label: 'Staples', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'spices', label: 'Spices', icon: Flame, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'dairy', label: 'Dairy', icon: Milk, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'veggies', label: 'Veggies', icon: Sprout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'others', label: 'Misc', icon: Tags, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

const UNITS = ['kg', 'ltr', 'pkt', 'nos', 'gm', 'ml'];

export default function Groceries() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('staples');
  const [newItemStock, setNewItemStock] = useState('1');
  const [newItemMin, setNewItemMin] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const { showToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'groceries'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Screen Wake Lock to keep mobile open during shopping
  useEffect(() => {
    let wakeLock: any = null;
    if (isShoppingMode && 'wakeLock' in navigator) {
      const requestWakeLock = async () => {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
        }
      };
      requestWakeLock();
    }
    return () => {
      if (wakeLock !== null) wakeLock.release();
    };
  }, [isShoppingMode]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    try {
      await addDoc(collection(db, 'groceries'), {
        name: newItemName,
        category: newItemCategory,
        currentStock: parseFloat(newItemStock),
        minStock: parseFloat(newItemMin),
        unit: newItemUnit,
        lastUpdated: new Date().toISOString()
      });
      setNewItemName('');
      setIsAdding(false);
      showToast(`${newItemName} added to pantry`, 'success');
    } catch (error) {
      console.error("Error adding item", error);
      showToast("Failed to add item", "error");
    }
  };

  const updateStock = async (id: string, newStock: number) => {
    try {
      await updateDoc(doc(db, 'groceries', id), { 
        currentStock: Math.max(0, newStock),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
       console.error("Error updating stock", error);
    }
  };

  const deleteItem = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'groceries', deleteId));
      showToast("Item removed from pantry", "success");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting item", error);
      showToast("Failed to remove item", "error");
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = filteredItems.filter(i => i.currentStock > 0 && i.currentStock <= i.minStock);
  const outOfStockItems = filteredItems.filter(i => i.currentStock === 0);
  const healthyItems = filteredItems.filter(i => i.currentStock > i.minStock);
  const shoppingList = filteredItems.filter(i => i.currentStock <= i.minStock);

  if (isShoppingMode) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] bg-[#1A1A1A] flex flex-col"
      >
        <header className="px-8 pt-12 pb-8 flex items-center justify-between border-b border-white/5">
           <div>
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-emerald-500 mb-1">Shopping Mode Active</p>
              <h2 className="text-3xl font-serif italic text-white font-black">Provision List.</h2>
           </div>
           <button 
             onClick={() => setIsShoppingMode(false)}
             className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center"
           >
              <X size={20} />
           </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8 scrollbar-hide">
           {shoppingList.length === 0 ? (
             <div className="py-20 text-center space-y-6">
                <CheckCircle2 size={60} className="text-emerald-500 mx-auto opacity-20" />
                <p className="text-white/40 font-serif italic text-lg">Pantry is fully stocked!</p>
                <button 
                  onClick={() => setIsShoppingMode(false)}
                  className="px-8 py-3 bg-white text-[#1A1A1A] rounded-full text-[10px] font-black uppercase tracking-widest"
                >
                  Return to Dashboard
                </button>
             </div>
           ) : (
             <div className="space-y-4">
               {shoppingList.map(item => (
                 <motion.button
                   key={item.id}
                   layout
                   onClick={() => updateStock(item.id, item.minStock * 2.5)} // Restock to 2.5x min level
                   className="w-full bg-white/5 p-6 rounded-[28px] border border-white/10 flex items-center justify-between group active:scale-95 transition-all"
                 >
                    <div className="flex items-center gap-4">
                       <div className="text-emerald-500">
                          <Square size={24} className="opacity-20" />
                       </div>
                       <div className="text-left">
                          <h3 className="text-white text-lg font-serif italic font-bold">{item.name}</h3>
                          <p className="text-white/30 text-[9px] uppercase tracking-widest font-black">Need: {item.minStock * 2} {item.unit}</p>
                       </div>
                    </div>
                    <div className="text-white/20">
                       <ShoppingCart size={18} />
                    </div>
                 </motion.button>
               ))}
             </div>
           )}
        </div>

        <footer className="p-8 bg-black/40 border-t border-white/5 text-center">
           <p className="text-[8px] uppercase tracking-[0.4em] font-black text-white/20 mb-4">Tap items as you put them in the cart</p>
           <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Screen Locked Awake</span>
           </div>
        </footer>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2 text-center">Provisions & Inventory</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A] text-center">
            Pantry.
          </h1>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
               <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20" />
               <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 h-14 bg-white border border-[#2D2926]/5 rounded-full text-xs font-bold uppercase tracking-widest outline-none focus:border-[#2D2926] transition-all shadow-sm"
               />
            </div>
            <button 
              onClick={() => setIsShoppingMode(true)}
              className="h-14 w-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
               <Zap size={20} />
            </button>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full h-14 bg-[#2D2926] text-[#FDFBF7] rounded-full flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl shadow-[#2D2926]/20 font-black text-[10px] uppercase tracking-widest"
          >
            <Plus size={18} /> Add Provision
          </button>
        </div>
      </header>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-[#2D2926]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-[calc(100%-2rem)] max-w-[400px] bg-[#FDFBF7] border border-[#2D2926]/10 rounded-[40px] shadow-2xl overflow-hidden relative z-[100] max-h-[85vh] overflow-y-auto scrollbar-hide"
            >
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-serif italic text-[#1A1A1A]">New Item</h2>
                   <button onClick={() => setIsAdding(false)} className="text-[#2D2926]/20"><X /></button>
                </div>

                <form onSubmit={handleAddItem} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sona Masuri Rice"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full bg-[#F5F1EA] rounded-2xl p-5 font-serif italic text-xl outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Category</label>
                        <select 
                          value={newItemCategory}
                          onChange={(e) => setNewItemCategory(e.target.value)}
                          className="w-full h-14 bg-white border border-[#2D2926]/5 rounded-xl px-4 text-xs font-bold uppercase tracking-widest appearance-none"
                        >
                           {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Unit</label>
                        <select 
                          value={newItemUnit}
                          onChange={(e) => setNewItemUnit(e.target.value)}
                          className="w-full h-14 bg-white border border-[#2D2926]/5 rounded-xl px-4 text-xs font-bold uppercase tracking-widest appearance-none"
                        >
                           {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Stock</label>
                        <input
                          type="number"
                          value={newItemStock}
                          onChange={(e) => setNewItemStock(e.target.value)}
                          className="w-full bg-white border border-[#2D2926]/5 rounded-xl p-4 font-bold text-center"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Min Alert</label>
                        <input
                          type="number"
                          value={newItemMin}
                          onChange={(e) => setNewItemMin(e.target.value)}
                          className="w-full bg-white border border-[#2D2926]/5 rounded-xl p-4 font-bold text-center"
                        />
                     </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-[#2D2926] text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">
                    Register Item
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pantry Sections */}
      <div className="space-y-12">
        {outOfStockItems.length > 0 && (
          <section className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-black text-rose-600">Depleted</h2>
             </div>
             <div className="space-y-4">
                {outOfStockItems.map(item => <PantryItem key={item.id} item={item} onUpdate={updateStock} onDelete={() => setDeleteId(item.id)} />)}
             </div>
          </section>
        )}

        {lowStockItems.length > 0 && (
          <section className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-600">Running Low</h2>
             </div>
             <div className="space-y-4">
                {lowStockItems.map(item => <PantryItem key={item.id} item={item} onUpdate={updateStock} onDelete={() => setDeleteId(item.id)} />)}
             </div>
          </section>
        )}

        <section className="space-y-6">
           <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-600">Available</h2>
           </div>
           <div className="space-y-4">
              {healthyItems.map(item => <PantryItem key={item.id} item={item} onUpdate={updateStock} onDelete={() => setDeleteId(item.id)} />)}
           </div>
           {items.length === 0 && !loading && (
             <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-[#2D2926]/10">
                <Package size={40} className="mx-auto mb-4 opacity-10" />
                <p className="text-[10px] uppercase tracking-widest font-black opacity-30 italic">Registry Empty</p>
             </div>
           )}
        </section>
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteItem}
        title="Remove Item"
        message="Are you sure you want to delete this provision record? This cannot be reversed."
      />
    </div>
  );
}

function PantryItem({ item, onUpdate, onDelete }: { item: any, onUpdate: any, onDelete: any }) {
  const category = CATEGORIES.find(c => c.id === item.category);
  const isOut = item.currentStock === 0;
  const isLow = item.currentStock > 0 && item.currentStock <= item.minStock;
  
  // Calculate percentage for progress bar (max 100)
  const percentage = Math.min(100, (item.currentStock / (item.minStock * 2)) * 100);

  return (
    <motion.div 
      layout
      className="bg-white p-6 rounded-[32px] border border-[#2D2926]/5 shadow-sm group relative overflow-hidden"
    >
       <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${category?.bg} ${category?.color} shadow-inner`}>
                {category ? <category.icon size={22} /> : <Package size={22} />}
             </div>
             <div>
                <h3 className="text-xl font-serif italic font-bold text-[#1A1A1A] leading-none mb-1">{item.name}</h3>
                <p className="text-[9px] uppercase tracking-widest font-black text-[#A67C52] opacity-40">{category?.label || 'General'}</p>
             </div>
          </div>
          <button onClick={onDelete} className="p-2 text-rose-500/20 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
             <X size={18} />
          </button>
       </div>

       <div className="space-y-4">
          <div className="flex items-end justify-between px-1">
             <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-widest font-black opacity-20">Current Stock</p>
                <p className={`text-2xl font-serif italic font-black ${isOut ? 'text-rose-600' : isLow ? 'text-orange-500' : 'text-[#1A1A1A]'}`}>
                   {item.currentStock} <span className="text-[10px] uppercase font-sans tracking-widest font-bold not-italic opacity-40">{item.unit}</span>
                </p>
             </div>
             <div className="flex bg-[#FDFBF7] rounded-xl border border-[#2D2926]/5 p-1">
                <button 
                  onClick={() => onUpdate(item.id, item.currentStock - 0.5)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white transition-all text-[#2D2926]"
                >
                   <Minus size={16} />
                </button>
                <button 
                  onClick={() => onUpdate(item.id, item.currentStock + 0.5)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white transition-all text-[#2D2926]"
                >
                   <Plus size={16} />
                </button>
             </div>
          </div>

          <div className="h-1.5 w-full bg-[#F5F1EA] rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${percentage}%` }}
               className={`h-full transition-all duration-700 ${isOut ? 'bg-rose-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`}
             />
          </div>
       </div>

       {isOut && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[7px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest">Depleted</div>}
       {isLow && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[7px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest">Restock</div>}
    </motion.div>
  );
}
