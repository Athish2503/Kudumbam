import { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  Home, 
  Wallet, 
  ShoppingCart, 
  ReceiptIndianRupee, 
  LogOut,
  User as UserIcon,
  Users,
  CheckSquare,
  Calendar,
  Heart,
  Wrench,
  Menu,
  Settings,
  Utensils,
  Zap
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, role, userData } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Dash' },
    { to: '/tasks', icon: CheckSquare, label: 'Chores' },
    { to: '/funds', icon: Wallet, label: 'Budget' },
    { to: '/groceries', icon: ShoppingCart, label: 'Pantry' },
    { to: '/calendar', icon: Calendar, label: 'Events' },
    { to: '/relatives', icon: Users, label: 'Sondham' },
    { to: '/dining', icon: Utensils, label: 'Dining' },
    { to: '/utilities', icon: Zap, label: 'Essential' },
    { to: '/health', icon: Heart, label: 'Health' },
    { to: '/maintenance', icon: Wrench, label: 'Home' },
    { to: '/reimbursements', icon: ReceiptIndianRupee, label: 'Claims' },
  ];

  if (role === 'admin') {
    navItems.push({ to: '/admin', icon: Settings, label: 'Admin' });
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D2926] flex flex-col font-sans max-w-[480px] mx-auto shadow-[0_0_100px_rgba(0,0,0,0.05)] relative border-x border-[#2D2926]/5">
      {/* Mobile Header - Always Visible */}
      <header className="bg-[#FDFBF7]/80 backdrop-blur-md border-b border-[#2D2926]/5 px-6 pt-10 pb-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1A1A] rounded-2xl flex items-center justify-center shadow-lg">
             <span className="text-xl font-serif text-[#FDFBF7] font-black italic">K.</span>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-[0.3em] font-bold opacity-30 leading-none mb-1">Our Home</p>
            <h1 className="text-2xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">Kudumbam.</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[10px] font-bold text-[#2D2926] leading-none mb-1">{userData?.nickname || user?.displayName?.split(' ')[0]}</p>
              <p className="text-[8px] text-[#A67C52] uppercase tracking-widest font-black italic leading-none">{role}</p>
           </div>
           <div className="w-10 h-10 rounded-full border-2 border-[#2D2926]/5 overflow-hidden flex items-center justify-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={18} className="text-[#2D2926]/20" />
              )}
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-32">
        <div className="px-6 py-8 w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav - Scrollable & Permanent */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-[480px] mx-auto px-4 pb-8 pointer-events-auto">
          <nav className="bg-[#1A1A1A] px-4 py-4 flex items-center gap-2 rounded-[32px] shadow-2xl overflow-x-auto scrollbar-hide border border-white/10">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex flex-col items-center gap-1.5 transition-all min-w-[65px]
                  ${isActive ? 'text-[#FDFBF7] scale-110' : 'text-[#FDFBF7]/30 hover:text-[#FDFBF7]/60'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[8px] uppercase tracking-tighter font-bold">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button 
              onClick={() => auth.signOut()}
              className="flex flex-col items-center gap-1.5 min-w-[65px] text-rose-400/60 hover:text-rose-400 transition-all"
            >
              <LogOut size={20} />
              <span className="text-[8px] uppercase tracking-tighter font-bold">Exit</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
