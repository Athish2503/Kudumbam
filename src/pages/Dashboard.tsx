import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { 
  Wallet, 
  ShoppingCart, 
  ReceiptIndianRupee, 
  ArrowUpRight, 
  Clock,
  TrendingUp,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, role } = useAuth();
  const [balance, setBalance] = useState(0);
  const [pendingGroceries, setPendingGroceries] = useState(0);
  const [pendingReimbursements, setPendingReimbursements] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch balance
        const balanceDoc = await getDoc(doc(db, 'metadata', 'wallet'));
        if (balanceDoc.exists()) {
          setBalance(balanceDoc.data().balance || 0);
        }

        // Fetch pending groceries
        const groceryQuery = query(collection(db, 'groceries'), where('status', '==', 'pending'));
        const grocerySnapshot = await getDocs(groceryQuery);
        setPendingGroceries(grocerySnapshot.size);

        // Fetch pending reimbursements
        const reimbQuery = query(collection(db, 'reimbursements'), where('status', '==', 'pending'));
        const reimbSnapshot = await getDocs(reimbQuery);
        setPendingReimbursements(reimbSnapshot.size);

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
  }, []);

  const stats = [
    { 
      label: 'Household Funds', 
      value: `₹${balance.toLocaleString('en-IN')}`, 
      icon: Wallet, 
      color: 'bg-[#E67E22]', 
      link: '/funds',
      desc: 'Shared household balance'
    },
    { 
      label: 'Pantry Status', 
      value: pendingGroceries, 
      icon: ShoppingCart, 
      color: 'bg-[#27AE60]', 
      link: '/groceries',
      desc: 'Items needing purchase'
    },
    { 
      label: 'Reimbursements', 
      value: pendingReimbursements, 
      icon: ReceiptIndianRupee, 
      color: 'bg-[#2980B9]', 
      link: '/reimbursements',
      desc: 'Total pending claims'
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
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold opacity-40 mb-2">Household Overview</p>
          <h1 className="text-5xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">
            Vanakkam, {user?.displayName?.split(' ')[0]}.
          </h1>
        </div>
        <Link 
          to="/funds" 
          className="w-fit py-3 px-8 bg-[#2D2926] text-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform"
        >
          Record Expense
        </Link>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
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
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold mb-6">Pantry Hint</h2>
            <div className="p-8 bg-[#F5F1EA] rounded-[40px] text-[#2D2926] relative overflow-hidden">
               <p className="text-[10px] italic font-bold opacity-40 mb-3 tracking-widest uppercase">Inventory Note</p>
               <p className="text-sm font-medium leading-relaxed mb-6 italic">
                "Checking Tamarind and Coconut levels might be wise for today's rasam."
              </p>
              <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#A67C52] border-t border-[#2D2926]/5 pt-4">
                Cycle: Monthly Grocery Day (1st)
              </div>
            </div>
          </div>

          <div>
             <h2 className="text-xs uppercase tracking-[0.2em] font-bold mb-6">Family Node</h2>
             <div className="space-y-6 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-serif text-sm">A</div>
                    <p className="text-xs font-bold uppercase tracking-widest">Amma (Admin)</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#27AE60] shadow-[0_0_8px_rgba(39,174,96,0.6)]"></span>
                </div>
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2D2926]/10 flex items-center justify-center font-serif text-sm">P</div>
                    <p className="text-xs font-bold uppercase tracking-widest">Appa</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                </div>
             </div>
          </div>
        </section>
      </div>

      <footer className="pt-12 border-t border-[#2D2926]/10 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold opacity-30">
         <span>Chennai Cloud Node • Active</span>
         <span className="italic font-normal">"Home is where the heart (and spices) are."</span>
      </footer>
    </div>
  );
}
