import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, query, limit, addDoc } from 'firebase/firestore';
import { Send, Home, MapPin, AlertTriangle, Speaker, Video, Phone, Settings } from 'lucide-react';

// --- MOCKING GLOBAL VARIABLES USING 'var' TO PREVENT RUNTIME 'ReferenceError' ---
/** @type {string} */
// eslint-disable-next-line no-var
var __app_id = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/** @type {string} */
// eslint-disable-next-line no-var
var __firebase_config = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';

/** @type {string | null} */
// eslint-disable-next-line no-var
var __initial_auth_token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

/** @type {(level: string) => void} */
// eslint-disable-next-line no-var
var setLogLevel = typeof setLogLevel !== 'undefined' ? setLogLevel : (level) => { /* console.log(`[MOCK] Setting log level to: ${level}`); */ };


// --- ACTUAL APP CONFIGURATION ---
const appId = __app_id;
const firebaseConfig = JSON.parse(__firebase_config);
const initialAuthToken = __initial_auth_token;

// Firestore Path (Public access for collaborative chat)
const PUBLIC_COLLECTION_PATH = `/artifacts/${appId}/public/data/chatMessages`;

// --- UI Components ---

// Component for a single Feed Item
const FeedItem = ({ type, title, description, timeAgo }) => {
  const getTypeStyles = () => {
    switch(type) {
      case 'UPDATE':
        return 'bg-blue-500 text-white';
      case 'TIP':
        return 'bg-green-500 text-white';
      case 'SETTINGS':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-purple-500 text-white';
    }
  };

  const getTypeIcon = () => {
    switch(type) {
      case 'UPDATE':
        return '🔄';
      case 'TIP':
        return '💡';
      case 'SETTINGS':
        return '⚙️';
      default:
        return '📢';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-4 shadow-md border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <span className="mr-2 text-lg">{getTypeIcon()}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getTypeStyles()}`}>
            {type}
          </span>
        </div>
        <span className="text-gray-500 text-xs">{timeAgo}</span>
      </div>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

// Bottom Navigation Item Component
const NavItem = ({ icon: Icon, label, isActive }) => (
  <div className={`flex flex-col items-center justify-center p-1.5 cursor-pointer transition-colors text-xs font-medium ${
    isActive ? 'text-teal-400' : 'text-gray-600'
  }`}>
    <Icon size={20} strokeWidth={isActive ? 3 : 1.5} />
    <span className="mt-1">{label}</span>
  </div>
);

// Main App Component
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('You'); 
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState(null);

  // Mock feed data matching the screenshot
  const feedItems = [
    {
      id: 1,
      type: 'SETTINGS',
      title: 'settings:',
      description: '',
      timeAgo: '5 hours ago'
    },
    {
      id: 2,
      type: 'UPDATE',
      title: 'New Resource Available',
      description: 'A new mental health support hotline has been added to our resources. Check Support & Resources in your profile.',
      timeAgo: '1 day ago'
    },
    {
      id: 3,
      type: 'UPDATE',
      title: 'Community Event: Safety Workshop',
      description: 'Join us for a free safety workshop this Saturday at 10 AM. Learn self-defense and personal safety techniques.',
      timeAgo: '2 days ago'
    },
    {
      id: 4,
      type: 'TIP',
      title: 'Safety Reminder',
      description: 'Always keep your emergency contacts updated. Review and update your trusted individuals list regularly.',
      timeAgo: '3 days ago'
    }
  ];

  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    let authInstance = null;
    try {
      if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey) {
        const errMsg = "Firebase config missing. Chat functionality disabled.";
        setError(errMsg);
        console.error(errMsg);
        setIsAuthReady(true);
        return; 
      }
      
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      authInstance = getAuth(app); 
      
      setDb(firestore);
      setLogLevel('Debug'); 

      // Attempt to sign in on component mount
      const attemptSignIn = async () => {
        try {
            if (initialAuthToken) {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } else {
              await signInAnonymously(authInstance);
            }
        } catch (e) {
            console.error("Initial sign-in failed:", e);
        }
      };

      attemptSignIn();

      const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          const newUserId = user.uid;
          setUserId(newUserId);
          // Set sender name using a snippet of the user ID (public data requirement)
          setUserName(`User ${newUserId.substring(0, 8)}`); 
        } else {
            // Fallback for unauthenticated state if needed
            setUserId(crypto.randomUUID()); 
            setUserName('Guest');
        }
        // CRITICAL: Ensure isAuthReady flips when auth state is confirmed
        setIsAuthReady(true);
        console.log("Auth State Confirmed. isAuthReady set to true.");
      });

      return () => unsubscribeAuth();
    } catch (e) {
      const errMsg = `Firebase initialization error: ${e.message}`;
      setError(errMsg);
      console.error(errMsg);
      setIsAuthReady(true);
    }
  }, []); // Runs only once on mount

  // 2. Data Listener (Firestore)
  useEffect(() => {
    // Only proceed if DB is ready, auth check is complete, and we have a userId
    if (!db || !isAuthReady || !userId || error) {
      return; 
    }

    try {
      // Query to fetch the latest 50 messages
      const q = query(
        collection(db, PUBLIC_COLLECTION_PATH),
        limit(50)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to number for sorting
                timestamp: data.timestamp ? (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate().getTime() : data.timestamp) : Date.now()
            };
        });
        
        // Sort by timestamp in memory (ascending for chat history)
        const sortedMessages = fetchedMessages.sort((a, b) => a.timestamp - b.timestamp); 
        
        setMessages(sortedMessages);
      }, (e) => {
        console.error("Error fetching messages:", e);
      });

      return () => unsubscribeSnapshot();
    } catch (e) {
      console.error("Firestore snapshot setup failed:", e);
    }
  }, [db, isAuthReady, userId, error]); 

  // 3. Message Send Function
  const handleSendMessage = async () => {
    // Check for readiness and non-empty message before sending
    if (newMessage.trim() === '' || !db || !userId || error) {
        console.error("Attempted send while not ready or message empty.");
        return;
    }

    try {
      const timestamp = Date.now();
      
      await addDoc(collection(db, PUBLIC_COLLECTION_PATH), {
        text: newMessage,
        senderId: userId,
        senderName: userName,
        timestamp: timestamp, 
      });
      setNewMessage('');
    } catch (e) {
      console.error("Error sending message:", e);
      setError(`Failed to send message: ${e.message}`);
    }
  };

  return (
    // Outer Container: Full screen height, centered content, light background
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start font-sans">
      
      {/* App Container - Centered and max-w for readability, fixed h-screen for mobile feel */}
      <div className="w-full max-w-3xl h-screen flex flex-col bg-white text-gray-800 shadow-2xl">

        {/* 1. Header (Top Bar) */}
        <header className="flex flex-col items-center p-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-center w-12 h-12 bg-teal-500 rounded-full mb-2">
            <Phone size={24} className="text-white" />
          </div>
          {/* Title is dark gray */}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SafeTap</h1>
          {/* Subtitle is gray */}
          <span className="text-sm font-medium text-gray-600 mt-1">Awareness Home Feed</span>
          <span className="text-xs text-gray-500 mt-1">Stay informed about community updates and safety alerts</span>
        </header>
        
        {/* 2. Main Content Area (Feed Area) */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
          {/* Feed Items */}
          <div className="space-y-4">
            {feedItems.map((item) => (
              <FeedItem
                key={item.id}
                type={item.type}
                title={item.title}
                description={item.description}
                timeAgo={item.timeAgo}
              />
            ))}
          </div>
        </main>

        {/* 3. Bottom Nav */}
        <nav className="flex justify-around p-3 bg-white border-t border-gray-200 shadow-lg">
          <NavItem icon={Home} label="Home" isActive={true} />
          <NavItem icon={MapPin} label="Live Locat..." isActive={false} />
          <NavItem icon={AlertTriangle} label="Park" isActive={false} />
          <NavItem icon={Speaker} label="Fake Screen" isActive={false} />
          <NavItem icon={Video} label="SOS" isActive={false} />
          <NavItem icon={Phone} label="Recording" isActive={false} />
        </nav>

      </div>
    </div>
  );
};

export default App;
