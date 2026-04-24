import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../App';

export default function NotificationManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sessionStartTime] = useState(Date.now());
  const [permission, setPermission] = useState<NotificationPermission>(
    'default'
  );

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    if (!user) return;

    // Listen for new notifications
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt?.toMillis() || Date.now();
          
          if (data.userId !== user.uid && createdAt > sessionStartTime - 5000) {
            // Actual System/Mobile Notification
            if (Notification.permission === 'granted') {
              new Notification('Kudumbam', {
                body: data.message,
                icon: '/favicon.ico',
                tag: 'kudumbam-update', // Prevent duplicate stacking
              });
            } else {
              // Fallback to in-app toast if system blocked
              showToast(data.message, data.type || 'success');
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, showToast, sessionStartTime]);

  if (permission === 'default' && user) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-4rem)] max-w-[400px]">
         <div className="bg-[#2D2926] p-6 rounded-[32px] shadow-2xl flex items-center justify-between border border-white/10 animate-bounce">
            <div>
               <p className="text-white text-xs font-black uppercase tracking-widest">Enable Alerts</p>
               <p className="text-white/40 text-[9px] uppercase tracking-widest">Get mobile push notifications</p>
            </div>
            <button 
              onClick={requestPermission}
              className="px-6 py-2 bg-white text-[#2D2926] rounded-full text-[9px] font-black uppercase tracking-widest"
            >
               Enable
            </button>
         </div>
      </div>
    );
  }

  return null;
}

export const sendNotification = async (userId: string, userName: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      userName,
      message: `${userName}: ${message}`,
      type,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error sending notification", error);
  }
};
