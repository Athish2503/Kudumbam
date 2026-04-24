import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  limit, 
  orderBy, 
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { sendNotification } from '../components/NotificationManager';
import { 
  Wallet, 
  ShoppingCart, 
  ReceiptIndianRupee, 
  ArrowUpRight, 
  Clock,
  TrendingUp,
  Plus,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, role, userData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [pendingGroceries, setPendingGroceries] = useState(0);
  const [pendingReimbursements, setPendingReimbursements] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [pendingMaintenance, setPendingMaintenance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminGrant, setShowAdminGrant] = useState(false);
  const [pantryTip, setPantryTip] = useState("Checking Tamarind and Coconut levels might be wise for today's rasam.");
  const [groceryTip, setGroceryTip] = useState("Monthly Grocery Day is the 1st");
  const [isEditingTips, setIsEditingTips] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch balance
        const balanceDoc = await getDoc(doc(db, 'metadata', 'wallet'));
        if (balanceDoc.exists()) {
          setBalance(balanceDoc.data().balance || 0);
        }

        // Fetch tips
        const dashDoc = await getDoc(doc(db, 'metadata', 'dashboard'));
        if (dashDoc.exists()) {
          setPantryTip(dashDoc.data().pantryTip || pantryTip);
          setGroceryTip(dashDoc.data().groceryTip || groceryTip);
        }

        // Fetch users to see if any are admin
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMembers(usersList);

        // Emergency Admin logic: If no one is admin, allow the current user to become one
        const hasAdmin = usersList.some(u => u.role === 'admin');
        if (!hasAdmin && role !== 'admin') {
          setShowAdminGrant(true);
        }

        // Fetch pending groceries
        const groceryQuery = query(collection(db, 'groceries'), where('status', '==', 'pending'));
        const grocerySnapshot = await getDocs(groceryQuery);
        setPendingGroceries(grocerySnapshot.size);

        // Fetch pending reimbursements
        const reimbQuery = query(collection(db, 'reimbursements'), where('status', '==', 'pending'));
        const reimbSnapshot = await getDocs(reimbQuery);
        setPendingReimbursements(reimbSnapshot.size);

        // Fetch pending tasks
        const tasksQuery = query(collection(db, 'tasks'), where('status', '==', 'pending'));
        const tasksSnapshot = await getDocs(tasksQuery);
        setPendingTasks(tasksSnapshot.size);

        // Fetch upcoming events
        const eventsQuery = query(collection(db, 'events'), where('date', '>=', new Date().toISOString().split('T')[0]));
        const eventsSnapshot = await getDocs(eventsQuery);
        setUpcomingEvents(eventsSnapshot.size);

        // Fetch pending maintenance
        const maintQuery = query(collection(db, 'maintenance'), where('status', '==', 'pending'));
        const maintSnapshot = await getDocs(maintQuery);
        setPendingMaintenance(maintSnapshot.size);

        // Fetch recent transactions
        const transQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(5));
        const transSnapshot = await getDocs(transQuery);
        setRecentTransactions(transSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role]);

  const grantAdmin = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
      const authorName = (userData?.nickname || user?.displayName || 'Someone');
      await sendNotification(user.uid, authorName, "Has taken Admin Control of the household.");
      setShowAdminGrant(false);
      window.location.reload();
    } catch (e) {
      console.error("Error granting admin", e);
    }
  };

  const saveTips = async () => {
    try {
      await setDoc(doc(db, 'metadata', 'dashboard'), {
        pantryTip,
        groceryTip
      }, { merge: true });
      setIsEditingTips(false);
    } catch (e) {
      console.error("Error saving tips", e);
    }
  };

  const stats = [
    { 
      label: 'Family Budget', 
      value: `₹${balance.toLocaleString('en-IN')}`, 
      icon: Wallet, 
      color: 'bg-[#E67E22]', 
      link: '/funds',
      desc: 'Available funds'
    },
    { 
      label: 'Grocery List', 
      value: pendingGroceries, 
      icon: ShoppingCart, 
      color: 'bg-[#27AE60]', 
      link: '/groceries',
      desc: 'Items to buy'
    },
    { 
      label: 'Chores & Tasks', 
      value: pendingTasks, 
      icon: Plus, 
      color: 'bg-[#F39C12]', 
      link: '/tasks',
      desc: 'Pending tasks'
    },
    { 
      label: 'Family Calendar', 
      value: upcomingEvents, 
      icon: Clock, 
      color: 'bg-[#2980B9]', 
      link: '/calendar',
      desc: 'Upcoming events'
    },
    { 
      label: 'Health Tracker', 
      value: 'Stable', 
      icon: Plus, 
      color: 'bg-rose-500', 
      link: '/health',
      desc: 'Wellness status'
    },
    { 
      label: 'Home Maintenance', 
      value: pendingMaintenance, 
      icon: Plus, 
      color: 'bg-[#1A1A1A]', 
      link: '/maintenance',
      desc: 'Service logs'
    },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-12">
        <div className="h-16 w-64 bg-[#2D2926]/5 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[1, 2, 3].map(i => <div key={i} className="h-56 bg-[#2D2926]/5 rounded-[40px]"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Family Dashboard</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Vanakkam, {(userData?.nickname || user?.displayName || '').split(' ')[0]}.
          </h1>
        </div>
        <Link 
          to="/funds" 
          className="w-fit py-3 px-8 bg-[#2D2926] text-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform"
        >
          Record Expense
        </Link>
        {showAdminGrant && (
           <button 
             onClick={grantAdmin}
             className="w-fit py-3 px-8 bg-emerald-600 text-white text-[10px] uppercase tracking-widest font-bold rounded-full hover:bg-emerald-700 transition-all flex items-center gap-3 animate-pulse"
           >
             <ShieldAlert size={16} />
             Take Admin Control
           </button>
        )}
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={stat.link} className="block group">
              <div className="bg-white p-8 rounded-[40px] border border-[#2D2926]/5 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                   <span className={`w-2 h-2 rounded-full ${stat.color}`}></span>
                   <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold">{stat.label}</h2>
                </div>
                <div className="space-y-2 mb-8">
                  <div className="text-4xl font-serif tracking-tight text-[#1A1A1A]">{stat.value}</div>
                  <p className="text-[10px] text-[#2D2926]/40 uppercase tracking-widest font-bold font-sans italic">{stat.desc}</p>
                </div>
                <div className={`h-1 w-0 group-hover:w-full transition-all duration-500 ${stat.color} rounded-full`}></div>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Recent Transactions */}
        <section className="lg:col-span-2 space-y-8">
          <div className="flex items-end justify-between border-b border-[#2D2926]/10 pb-4">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Recent Activity</h2>
            <Link to="/funds" className="text-[10px] uppercase font-bold text-[#A67C52] hover:underline tracking-widest">View Archives</Link>
          </div>
          <div className="space-y-6">
            {recentTransactions.length > 0 ? (
              <div className="divide-y divide-[#2D2926]/5">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-5 flex items-center justify-between group hover:pl-2 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full border border-[#2D2926]/10 flex items-center justify-center text-[#2D2926]/40 group-hover:border-[#2D2926] transition-colors">
                        {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ReceiptIndianRupee size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight">{tx.description || tx.category}</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mt-0.5 italic">{tx.userName} • {new Date(tx.date).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    <div className={`font-mono text-sm ${tx.type === 'income' ? 'text-[#27AE60]' : 'text-[#2D2926]'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[#2D2926]/20">
                <Clock size={40} className="mx-auto mb-4 opacity-10" />
                <p className="text-[10px] uppercase font-bold tracking-widest">Quiet in the household</p>
              </div>
            )}
          </div>
        </section>

        {/* Info Column */}
        <section className="space-y-12">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Quick Tips</h2>
              {role === 'admin' && (
                <button 
                  onClick={() => isEditingTips ? saveTips() : setIsEditingTips(true)}
                  className="text-[10px] uppercase font-black tracking-widest text-[#A67C52] hover:opacity-60 transition-opacity"
                >
                  {isEditingTips ? 'Save' : 'Edit'}
                </button>
              )}
            </div>
            
            <div className="p-8 bg-[#F5F1EA] rounded-[40px] text-[#2D2926] relative overflow-hidden group shadow-sm">
               <p className="text-[10px] italic font-bold opacity-40 mb-3 tracking-widest uppercase">Pantry Note</p>
               
               {isEditingTips ? (
                 <textarea 
                   value={pantryTip}
                   onChange={(e) => setPantryTip(e.target.value)}
                   className="w-full bg-white/50 border border-[#2D2926]/5 rounded-2xl p-4 text-sm font-medium mb-6 outline-none focus:bg-white transition-all"
                   rows={3}
                 />
               ) : (
                 <p className="text-sm font-medium leading-relaxed mb-6 italic">
                   "{pantryTip}"
                 </p>
               )}

               <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#A67C52] border-t border-[#2D2926]/5 pt-4">
                  {isEditingTips ? (
                    <input 
                      value={groceryTip}
                      onChange={(e) => setGroceryTip(e.target.value)}
                      className="w-full bg-transparent border-none outline-none font-bold"
                      placeholder="Grocery Tip..."
                    />
                  ) : (
                    <span>Tip: {groceryTip}</span>
                  )}
               </div>
            </div>
          </div>

          <div>
             <h2 className="text-xs uppercase tracking-[0.2em] font-bold mb-6">Family Members</h2>
              <div className="space-y-6 px-2">
                 {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#2D2926] overflow-hidden flex items-center justify-center text-white font-serif text-sm">
                           {member.photoURL ? (
                             <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <span>{(member.nickname || member.displayName || '?').charAt(0)}</span>
                           )}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest">{member.nickname || member.displayName}</p>
                          <p className="text-[8px] uppercase tracking-[0.2em] font-black opacity-30 italic">{member.role}</p>
                        </div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${member.role === 'admin' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(39,174,96,0.6)]' : 'bg-slate-300'}`}></span>
                    </div>
                 ))}
                 {members.length === 0 && <p className="text-[10px] italic opacity-20">No members found</p>}
              </div>
          </div>
        </section>
      </div>

      <footer className="pt-12 border-t border-[#2D2926]/10 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold opacity-30">
         <span>Chennai Home • Active</span>
         <span className="italic font-normal">"Home is where the heart (and spices) are."</span>
      </footer>
    </div>
  );
}
