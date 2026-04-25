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
  Users,
  Search,
  Phone,
  Cake,
  Heart,
  ArrowRight,
  X,
  MessageCircle,
  MoreVertical,
  UserPlus as UserPlusIcon,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const RELATIONSHIPS = [
  'Appa', 'Amma', 'Chithappa', 'Chithi', 'Periyappa', 'Periyamma', 
  'Mama', 'Mami', 'Athai', 'Mama (Maternal)', 'Anna', 'Akka', 
  'Thambi', 'Thangachi', 'Macha', 'Machini', 'Friend', 'Other'
];

export default function Relatives() {
  const [relatives, setRelatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Mama');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingRelative, setEditingRelative] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'relatives'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRelatives(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const importContacts = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      showToast("Contact picker not supported on this browser/device.", "error");
      return;
    }

    try {
      const props = ['name', 'tel', 'email', 'address', 'icon', 'birthday'];
      const opts = { multiple: false };
      // @ts-ignore
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        const contact = contacts[0];
        setName(contact.name?.[0] || '');
        setPhone(contact.tel?.[0] || '');
        
        if (contact.birthday) {
           const bday = new Date(contact.birthday);
           if (!isNaN(bday.getTime())) {
             setBirthday(bday.toISOString().split('T')[0]);
           }
        }

        setIsAdding(true);
        showToast("Contact details imported! Please verify and save.");
      }
    } catch (ex) {
      console.error("Handle properly", ex);
    }
  };

  const handleAddRelative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const relativeData = {
        name,
        relationship,
        birthday,
        phone,
        notes,
        lastUpdated: new Date().toISOString()
      };

      if (editingRelative) {
        await updateDoc(doc(db, 'relatives', editingRelative.id), relativeData);
        showToast("Relative updated!");
      } else {
        await addDoc(collection(db, 'relatives'), relativeData);
        showToast("Sondham added to directory!");
      }

      setName('');
      setBirthday('');
      setPhone('');
      setNotes('');
      setIsAdding(false);
      setEditingRelative(null);
    } catch (error) {
      console.error("Error saving relative", error);
      showToast("Failed to save relative", "error");
    }
  };

  const startEditing = (rel: any) => {
    setEditingRelative(rel);
    setName(rel.name);
    setRelationship(rel.relationship);
    setBirthday(rel.birthday || '');
    setPhone(rel.phone || '');
    setNotes(rel.notes || '');
    setIsAdding(true);
  };

  const deleteRelative = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'relatives', deleteId));
      showToast("Relative removed.");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting relative", error);
      showToast("Failed to remove relative", "error");
    }
  };

  const filteredRelatives = relatives.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.relationship.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Extended Family</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Sondham.
          </h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={importContacts}
            className="w-fit py-3 px-6 text-[10px] uppercase tracking-widest font-black rounded-full border border-[#2D2926]/10 hover:bg-[#2D2926] hover:text-white transition-all flex items-center gap-3"
          >
            <UserPlusIcon size={16} />
            <span>Import</span>
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`w-fit py-3 px-8 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all flex items-center gap-3 ${
              isAdding 
                ? 'bg-[#2D2926] text-[#FDFBF7]' 
                : 'bg-indigo-600 text-white hover:scale-105 shadow-xl shadow-indigo-600/20'
            }`}
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            <span>{isAdding ? 'Close' : 'Add'}</span>
          </button>
        </div>
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
              onSubmit={handleAddRelative}
              className="bg-white p-10 rounded-[40px] border border-[#2D2926]/10 space-y-10 shadow-2xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Mama, Latha Athai..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent text-3xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                      autoFocus
                      required
                    />
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Relationship</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full h-[58px] px-4 rounded-2xl border border-[#2D2926]/10 bg-white font-bold text-xs uppercase tracking-widest outline-none appearance-none"
                    >
                      {RELATIONSHIPS.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Birthday</label>
                  <div className="relative">
                    <Cake className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/20" size={18} />
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 pl-12 font-bold text-xs outline-none focus:border-[#2D2926]"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Phone (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/20" size={18} />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 pl-12 font-bold text-xs outline-none focus:border-[#2D2926]"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10 flex items-center justify-center gap-3"
              >
                {editingRelative ? 'Save Changes' : 'Save Sondham'} <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#2D2926]/20" size={20} />
        <input 
          type="text" 
          placeholder="Search for relatives or relationship..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-[#2D2926]/5 rounded-full py-6 pl-16 pr-6 font-bold text-xs outline-none focus:border-[#2D2926] shadow-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
         {filteredRelatives.map((rel) => (
           <motion.div 
             key={rel.id}
             layout
             className="bg-white p-6 rounded-[32px] border border-[#2D2926]/5 flex items-center justify-between group shadow-sm hover:shadow-xl transition-all duration-500"
           >
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-serif italic font-black shadow-inner">
                    {rel.name.charAt(0)}
                 </div>
                 <div>
                    <div className="flex items-center gap-3">
                       <h3 className="text-lg font-serif italic font-bold">{rel.name}</h3>
                       <span className="px-3 py-1 bg-[#F5F1EA] text-[8px] uppercase font-black tracking-widest rounded-full opacity-60">{rel.relationship}</span>
                    </div>
                    <div className="flex gap-4 mt-2">
                       {rel.birthday && (
                         <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-30">
                            <Cake size={12} />
                            {new Date(rel.birthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                         </div>
                       )}
                       {rel.phone && (
                         <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-30">
                            <Phone size={12} />
                            {rel.phone}
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-1">
                 {rel.phone && (
                   <a 
                     href={`https://wa.me/${rel.phone.replace(/[^0-9]/g, '')}`} 
                     target="_blank" 
                     rel="noreferrer"
                     className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:scale-110 transition-all"
                   >
                      <MessageCircle size={18} />
                   </a>
                 )}
                 <button 
                  onClick={() => startEditing(rel)}
                  className="w-10 h-10 rounded-full text-[#2D2926]/10 hover:text-[#2D2926] transition-all opacity-0 group-hover:opacity-100"
                 >
                    <Settings size={18} />
                 </button>
                 <button 
                  onClick={() => setDeleteId(rel.id)}
                  className="w-10 h-10 rounded-full text-[#2D2926]/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                 >
                    <Trash2 size={18} />
                 </button>
              </div>
           </motion.div>
         ))}

         {filteredRelatives.length === 0 && (
           <div className="py-24 text-center border-2 border-dashed border-[#2D2926]/5 rounded-[40px] space-y-4">
              <Users size={40} className="text-[#2D2926]/5 mx-auto" />
              <p className="text-[10px] uppercase font-black tracking-widest opacity-20">Scanning Sondham...</p>
           </div>
         )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteRelative}
        title="Remove Sondham"
        message="Are you sure you want to remove this relative from the family directory?"
      />
    </div>
  );
}
