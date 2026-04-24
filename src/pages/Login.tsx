import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          role: 'member', // Default role
          photoURL: user.photoURL,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Please check your internet connection.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 font-sans text-[#2D2926]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-sm space-y-16 text-center"
      >
        <header className="space-y-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-[#1A1A1A] rounded-[40px] flex items-center justify-center mx-auto shadow-2xl relative"
          >
            <div className="absolute inset-0 border border-[#FDFBF7]/10 rounded-[40px]"></div>
            <span className="text-5xl font-serif text-[#FDFBF7] font-black italic">K.</span>
          </motion.div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-serif font-black italic tracking-tighter text-[#1A1A1A]">Kudumbam.</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30 italic">Smart Family Registry</p>
          </div>
        </header>
        
        <div className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-[#2D2926]">Welcome to the Ledger</h2>
            <p className="text-sm font-medium text-[#2D2926]/40 italic leading-relaxed">
              Synchronize your household resources, provisioning, and fiscal requests across the network.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full h-16 bg-white border border-[#2D2926]/10 flex items-center justify-center gap-4 rounded-full font-bold text-[#2D2926] transition-all hover:border-[#2D2926] hover:shadow-2xl active:scale-95 group shadow-sm"
          >
            <div className="w-6 h-6 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all">
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold">Authenticate via Google</span>
          </button>

          <footer className="pt-12 border-t border-[#2D2926]/10 flex flex-wrap justify-center gap-x-8 gap-y-4 opacity-20">
             <span className="text-[9px] font-bold uppercase tracking-widest">Treasury</span>
             <span className="text-[9px] font-bold uppercase tracking-widest">Pantry</span>
             <span className="text-[9px] font-bold uppercase tracking-widest">Claims</span>
          </footer>
        </div>
      </motion.div>
      
      <p className="fixed bottom-12 text-[10px] text-[#2D2926]/20 font-bold uppercase tracking-[0.3em]">Chennai Cloud Node • v1.0</p>
    </div>
  );
}
