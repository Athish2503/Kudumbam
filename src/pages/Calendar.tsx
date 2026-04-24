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
import { useAuth } from '../App';
import { sendNotification } from '../components/NotificationManager';
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  X,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, parseISO } from 'date-fns';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Calendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { showToast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('Event'); // Event, Birthday, Anniversary

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    try {
      await addDoc(collection(db, 'events'), {
        title,
        date,
        time,
        location,
        type,
        lastUpdated: new Date().toISOString()
      });
      setTitle('');
      setIsAdding(false);
      showToast("Event added to family calendar!");
      
      const authorName = (useAuth().userData?.nickname || 'Someone');
      sendNotification(useAuth().user?.uid || '', authorName, `Added a new event: ${title} on ${date}`);
    } catch (error) {
      console.error("Error adding event", error);
      showToast("Failed to add event", "error");
    }
  };

  const deleteEvent = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'events', deleteId));
      showToast("Event removed.");
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting event", error);
      showToast("Failed to remove event", "error");
    }
  };

  // Group events by month
  const groupedEvents = events.reduce((groups: any, event) => {
    const month = format(parseISO(event.date), 'MMMM yyyy');
    if (!groups[month]) groups[month] = [];
    groups[month].push(event);
    return groups;
  }, {});

  return (
    <div className="space-y-16 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Family Calendar</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Upcoming Events.
          </h1>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-fit py-3 px-8 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all flex items-center gap-3 ${
            isAdding 
              ? 'bg-[#2D2926] text-[#FDFBF7]' 
              : 'bg-[#2980B9] text-white hover:scale-105 shadow-xl shadow-[#2980B9]/20'
          }`}
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          <span>{isAdding ? 'Close' : 'Add Event'}</span>
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
              onSubmit={handleAddEvent}
              className="bg-white p-10 rounded-[40px] border border-[#2D2926]/10 space-y-10 shadow-2xl"
            >
              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Family Trip, Amma's Birthday..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-3xl font-serif italic outline-none text-[#1A1A1A] border-b border-[#2D2926]/10 focus:border-[#2D2926] transition-colors pb-2"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Time (Optional)</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 font-bold text-xs outline-none focus:border-[#2D2926]"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-[58px] px-4 rounded-2xl border border-[#2D2926]/10 bg-white font-bold text-xs uppercase tracking-widest outline-none appearance-none"
                  >
                    <option value="Event">Event</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/20" size={18} />
                  <input
                    type="text"
                    placeholder="e.g. Grand Residence, Chennai..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-[#2D2926]/10 rounded-2xl p-4 pl-12 font-bold text-xs outline-none focus:border-[#2D2926]"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-[#2D2926] text-[#FDFBF7] text-xs uppercase tracking-[0.3em] font-bold rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#2D2926]/10 flex items-center justify-center gap-3"
              >
                Add Event <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-20">
        {Object.keys(groupedEvents).length > 0 ? Object.entries(groupedEvents).map(([month, monthEvents]: [string, any]) => (
          <section key={month} className="space-y-10">
            <div className="flex items-center gap-6">
               <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#A67C52] whitespace-nowrap">{month}</h2>
               <div className="h-px w-full bg-[#2D2926]/5"></div>
            </div>

            <div className="grid grid-cols-1 gap-8">
               {monthEvents.map((event: any, i: number) => (
                 <motion.div 
                   key={event.id}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className="flex gap-8 group"
                 >
                    <div className="flex flex-col items-center gap-2">
                       <div className="text-3xl font-serif italic font-black text-[#1A1A1A]">
                          {format(parseISO(event.date), 'dd')}
                       </div>
                       <div className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                          {format(parseISO(event.date), 'EEE')}
                       </div>
                    </div>

                    <div className="flex-1 bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm group-hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                       <div className="flex justify-between items-start mb-4">
                          <div className={`px-4 py-1.5 rounded-full text-[8px] uppercase tracking-[0.2em] font-bold ${
                            event.type === 'Birthday' ? 'bg-pink-50 text-pink-600' :
                            event.type === 'Anniversary' ? 'bg-amber-50 text-amber-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                             {event.type}
                          </div>
                          <button onClick={() => setDeleteId(event.id)} className="opacity-0 group-hover:opacity-100 transition-all p-3 text-red-500/20 hover:text-red-500">
                             <X size={18} />
                          </button>
                       </div>

                       <h3 className="text-2xl font-serif italic font-bold text-[#1A1A1A] mb-6 group-hover:text-[#2980B9] transition-colors">{event.title}</h3>
                       
                       <div className="flex flex-wrap gap-8">
                          {event.time && (
                            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold opacity-40">
                               <Clock size={14} className="text-[#A67C52]" />
                               {event.time}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold opacity-40">
                               <MapPin size={14} className="text-[#A67C52]" />
                               {event.location}
                            </div>
                          )}
                       </div>

                       {event.type === 'Birthday' && <Star className="absolute -right-4 -bottom-4 text-pink-500/5 rotate-12" size={120} />}
                    </div>
                 </motion.div>
               ))}
            </div>
          </section>
        )) : (
          <div className="py-32 text-center border-2 border-dashed border-[#2D2926]/10 rounded-[40px] space-y-6">
             <CalendarIcon size={60} className="text-[#2D2926]/5 mx-auto" />
             <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-30 italic">No events scheduled yet</p>
          </div>
        )}
      </div>
      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteEvent}
        title="Delete Event"
        message="Are you sure you want to remove this event? This action is permanent."
      />
    </div>
  );
}
