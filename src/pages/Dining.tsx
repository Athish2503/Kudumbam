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
  Utensils,
  Star,
  MapPin,
  Share2,
  PlusCircle,
  ArrowRight,
  X,
  Clock,
  IndianRupee,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Dining() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState(5);
  const [avgPrice, setAvgPrice] = useState('');
  const [favoriteDishes, setFavoriteDishes] = useState<{name: string, price: string}[]>([]);
  const [currentDish, setCurrentDish] = useState('');
  const [currentDishPrice, setCurrentDishPrice] = useState('');
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'dining'), orderBy('lastVisit', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addDish = () => {
    if (!currentDish.trim()) return;
    setFavoriteDishes([...favoriteDishes, { name: currentDish.trim(), price: currentDishPrice.trim() }]);
    setCurrentDish('');
    setCurrentDishPrice('');
  };

  const removeDish = (index: number) => {
    setFavoriteDishes(favoriteDishes.filter((_, i) => i !== index));
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      await addDoc(collection(db, 'dining'), {
        name,
        location,
        rating,
        avgPrice: parseFloat(avgPrice) || 0,
        favoriteDishes,
        notes,
        lastVisit: new Date().toISOString()
      });
      setName('');
      setLocation('');
      setAvgPrice('');
      setFavoriteDishes([]);
      setCurrentDish('');
      setCurrentDishPrice('');
      setNotes('');
      setIsAdding(false);
      showToast("Restaurant added to family list!");
    } catch (error) {
      console.error("Error adding dining", error);
      showToast("Failed to add restaurant", "error");
    }
  };

  const deleteRestaurant = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'dining', deleteId));
      showToast("Restaurant removed.");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting dining", error);
      showToast("Failed to remove restaurant", "error");
    }
  };

  const shareRestaurant = (res: any) => {
    const dishList = res.favoriteDishes?.map((d: any) => `• ${d.name}${d.price ? ` (₹${d.price})` : ''}`).join('\n') || 'N/A';
    const text = `
🍴 *Family Favourite: ${res.name}*
📍 ${res.location}
⭐ Rating: ${res.rating}/5

🥘 *Must Try Dishes:*
${dishList}

💰 Avg Price for 2: ₹${res.avgPrice}
📝 Notes: ${res.notes}

_Shared via Kudumbam Family OS_
    `.trim();
    
    if (navigator.share) {
       navigator.share({ title: res.name, text });
    } else {
       navigator.clipboard.writeText(text);
       showToast("Details copied to clipboard!");
    }
  };

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Food & Dining</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Restaurants.
          </h1>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-fit py-3 px-8 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all flex items-center gap-3 ${
            isAdding 
              ? 'bg-[#2D2926] text-[#FDFBF7]' 
              : 'bg-emerald-600 text-white hover:scale-105 shadow-xl shadow-emerald-600/20'
          }`}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          <span>{isAdding ? 'Close' : 'Add Favourite'}</span>
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
              onSubmit={handleAddRestaurant}
              className="bg-white p-10 rounded-[40px] border border-[#2D2926]/10 space-y-10 shadow-2xl"
            >
              <div className="space-y-4">
                 <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Restaurant Name</label>
                 <input
                   type="text"
                   placeholder="e.g. Sangeetha, Murugan Idli, Tuscany..."
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full bg-transparent text-3xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                   autoFocus
                   required
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Location</label>
                    <div className="relative">
                       <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/20" size={18} />
                       <input
                         type="text"
                         placeholder="e.g. Adyar, T.Nagar..."
                         value={location}
                         onChange={(e) => setLocation(e.target.value)}
                         className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 pl-12 font-bold text-xs outline-none focus:border-[#2D2926]"
                       />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Rating</label>
                    <div className="flex gap-2">
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button 
                           key={star} 
                           type="button" 
                           onClick={() => setRating(star)}
                           className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${rating >= star ? 'bg-amber-100 text-amber-600' : 'bg-gray-50 text-gray-300'}`}
                         >
                            <Star size={20} fill={rating >= star ? 'currentColor' : 'none'} />
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Must Try Dishes Table</label>
                 <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                       <input
                         type="text"
                         placeholder="Dish Name (e.g. Ghee Roast)"
                         value={currentDish}
                         onChange={(e) => setCurrentDish(e.target.value)}
                         className="flex-[2] bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                       />
                       <input
                         type="number"
                         placeholder="Price (₹)"
                         value={currentDishPrice}
                         onChange={(e) => setCurrentDishPrice(e.target.value)}
                         className="flex-1 bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                       />
                       <button 
                         type="button" 
                         onClick={addDish}
                         className="px-6 bg-[#2D2926] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                       >
                          Add
                       </button>
                    </div>
                 </div>
                 
                 <div className="flex flex-wrap gap-3">
                    {favoriteDishes.map((dish, idx) => (
                      <div key={idx} className="bg-[#F5F1EA] px-4 py-2 rounded-full flex items-center gap-3 group">
                         <span className="text-[10px] font-bold text-[#2D2926]">
                            {dish.name} {dish.price && <span className="opacity-40 ml-1">₹{dish.price}</span>}
                         </span>
                         <button type="button" onClick={() => removeDish(idx)} className="text-red-500 hover:scale-110 transition-all">
                            <X size={12} />
                         </button>
                      </div>
                    ))}
                    {favoriteDishes.length === 0 && <p className="text-[9px] uppercase tracking-widest font-bold opacity-20 italic">No dishes added yet</p>}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Avg Price for 2 (₹)</label>
                    <input
                      type="number"
                      placeholder="800"
                      value={avgPrice}
                      onChange={(e) => setAvgPrice(e.target.value)}
                      className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                    />
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Your Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Good for families, quiet on weekdays..."
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
                Save Favourite <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-10">
         {restaurants.map((res) => (
           <motion.div 
             key={res.id}
             layout
             className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden relative"
           >
              <div className="flex justify-between items-start mb-8">
                 <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < res.rating ? '#F39C12' : 'none'} className={i < res.rating ? 'text-[#F39C12]' : 'text-gray-200'} />
                    ))}
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => shareRestaurant(res)}
                      className="w-10 h-10 rounded-full border border-[#2D2926]/5 flex items-center justify-center text-[#2D2926]/20 hover:text-[#2D2926] hover:border-[#2D2926] transition-all"
                    >
                       <Share2 size={16} />
                    </button>
                    <button 
                      onClick={() => setDeleteId(res.id)}
                      className="w-10 h-10 rounded-full text-red-500/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                       <Trash2 size={16} />
                    </button>
                 </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <h3 className="text-3xl font-serif italic font-bold text-[#1A1A1A] group-hover:text-emerald-600 transition-colors mb-1">{res.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black opacity-30 italic">
                       <MapPin size={12} />
                       {res.location}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8 py-6 border-y border-[#2D2926]/5">
                    <div>
                       <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-2">Must Try Table</p>
                       <div className="space-y-1">
                          {res.favoriteDishes?.map((dish: any, i: number) => (
                             <p key={i} className="text-[10px] font-bold text-[#2D2926] flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                   <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                                   {dish.name}
                                </span>
                                {dish.price && <span className="opacity-40 italic">₹{dish.price}</span>}
                             </p>
                          ))}
                          {(!res.favoriteDishes || res.favoriteDishes.length === 0) && <p className="text-[10px] font-bold text-[#2D2926]">N/A</p>}
                       </div>
                    </div>
                    <div>
                       <p className="text-[9px] uppercase tracking-widest font-black opacity-30 mb-2">Avg for 2</p>
                       <p className="text-xs font-bold text-[#2D2926]">₹{res.avgPrice || '???'}</p>
                    </div>
                 </div>

                 {res.notes && (
                   <p className="text-[10px] font-medium leading-relaxed opacity-40 italic">
                      "{res.notes}"
                   </p>
                 )}
              </div>
              
              <div className="absolute right-0 bottom-0 p-8 opacity-0 group-hover:opacity-100 transition-all">
                 <ChevronRight size={40} className="text-[#2D2926]/5" />
              </div>
           </motion.div>
         ))}

         {restaurants.length === 0 && (
           <div className="py-24 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px] space-y-4">
              <Utensils size={40} className="text-[#2D2926]/5 mx-auto" />
              <p className="text-[10px] uppercase font-black tracking-widest opacity-20 italic">No food logs yet...</p>
           </div>
         )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteRestaurant}
        title="Remove Restaurant"
        message="Are you sure you want to remove this favourite from the family dining list?"
      />
    </div>
  );
}
