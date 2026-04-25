import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Funds from './pages/Funds';
import Groceries from './pages/Groceries';
import Reimbursements from './pages/Reimbursements';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Health from './pages/Health';
import Maintenance from './pages/Maintenance';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Relatives from './pages/Relatives';
import Dining from './pages/Dining';
import Utilities from './pages/Utilities';
import Laundry from './pages/Laundry';
import SetupWarning from './components/SetupWarning';
import { ToastProvider } from './context/ToastContext';
import NotificationManager from './components/NotificationManager';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  userData: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null, userData: null });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Real-time listener for the user's document
        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setUserData(data);
            setRole(data.role || 'member');
          } else {
            setRole('member');
            setUserData(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user doc", error);
          setLoading(false);
        });
      } else {
        setRole(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
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
    <AuthContext.Provider value={{ user, loading, role, userData }}>
      <ToastProvider>
        <NotificationManager />
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
              path="/tasks"
              element={user ? <Layout><Tasks /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/calendar"
              element={user ? <Layout><Calendar /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/health"
              element={user ? <Layout><Health /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/maintenance"
              element={user ? <Layout><Maintenance /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/admin"
              element={user && role === 'admin' ? <Layout><Admin /></Layout> : <Navigate to="/" />}
            />
            <Route
              path="/reimbursements"
              element={user ? <Layout><Reimbursements /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/relatives"
              element={user ? <Layout><Relatives /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/dining"
              element={user ? <Layout><Dining /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/utilities"
              element={user ? <Layout><Utilities /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/laundry"
              element={user ? <Layout><Laundry /></Layout> : <Navigate to="/login" />}
            />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthContext.Provider>
  );
}
