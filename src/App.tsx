import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Funds from './pages/Funds';
import Groceries from './pages/Groceries';
import Reimbursements from './pages/Reimbursements';
import Login from './pages/Login';
import SetupWarning from './components/SetupWarning';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            setRole('member');
          }
        } catch (e) {
          console.error("Error fetching user role", e);
          setRole('member');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!isFirebaseConfigured) {
    return <SetupWarning />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />}
          />
          <Route
            path="/funds"
            element={user ? <Layout><Funds /></Layout> : <Navigate to="/login" />}
          />
          <Route
            path="/groceries"
            element={user ? <Layout><Groceries /></Layout> : <Navigate to="/login" />}
          />
          <Route
            path="/reimbursements"
            element={user ? <Layout><Reimbursements /></Layout> : <Navigate to="/login" />}
          />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
