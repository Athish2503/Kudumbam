import { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  Home, 
  Wallet, 
  ShoppingCart, 
  ReceiptIndianRupee, 
  Settings, 
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, role } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/funds', icon: Wallet, label: 'Funds' },
    { to: '/groceries', icon: ShoppingCart, label: 'Groceries' },
    { to: '/reimbursements', icon: ReceiptIndianRupee, label: 'Claims' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D2926] flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-[#2D2926]/5 flex-col sticky top-0 h-screen">
        <div className="p-10">
          <Link to="/" className="block mb-12">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 mb-1">Household</p>
            <h1 className="text-4xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">Kudumbam.</h1>
          </Link>

          <nav className="space-y-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-4 transition-all duration-300
                  ${isActive 
                    ? 'text-[#2D2926] font-bold translate-x-2' 
                    : 'text-[#2D2926]/40 hover:text-[#2D2926]'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-xs uppercase tracking-[0.15em]">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-10 border-t border-[#2D2926]/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#2D2926] flex items-center justify-center text-[#FDFBF7] font-serif text-lg overflow-hidden shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-[#2D2926] truncate">{user?.displayName || 'Family Member'}</p>
              <p className="text-[9px] text-[#A67C52] uppercase tracking-widest font-black italic">{role}</p>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 text-[#2D2926]/40 hover:text-[#C0392B] transition-colors text-[10px] uppercase font-black tracking-widest"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-[#FDFBF7] border-b border-[#2D2926]/5 px-8 pt-8 pb-4 flex items-center justify-between sticky top-0 z-50">
          <div>
            <p className="text-[8px] uppercase tracking-[0.3em] font-bold opacity-30 mb-0.5">Household</p>
            <h1 className="text-3xl font-serif italic font-black leading-none tracking-tighter text-[#1A1A1A]">Kudumbam.</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#2D2926] overflow-hidden flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={18} className="text-[#FDFBF7]" />
            )}
          </div>
        </header>

        <div className="px-8 md:px-16 py-10 md:py-16 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#2D2926]/5 px-8 py-5 flex items-center justify-between z-50 rounded-t-[40px] shadow-2xl">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 transition-colors
              ${isActive ? 'text-[#2D2926]' : 'text-[#2D2926]/20'}
            `}
          >
            {({ isActive }) => (
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
