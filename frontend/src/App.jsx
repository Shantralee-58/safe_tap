import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, query, limit, addDoc } from 'firebase/firestore';
import { Send, Home, MapPin, AlertTriangle, Speaker, Video, Phone } from 'lucide-react';

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

// Component for a single Chat Bubble
const ChatBubble = ({ message, isCurrentUser, userName }) => {
    // Ensure timestamp is a number/Date object before converting
    let timeValue = new Date();
    if (message.timestamp) {
        // Handle Firestore Timestamp object or plain number
        timeValue = (typeof message.timestamp === 'object' && typeof message.timestamp.toDate === 'function')
            ? message.timestamp.toDate() 
            : new Date(message.timestamp);
    }
    const time = timeValue.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Function to get initials from the user name
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    };

    return (
        <div className={`flex w-full ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] sm:max-w-[70%] lg:max-w-[50%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* User Avatar/Initials */}
                {!isCurrentUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/30 text-teal-300 font-bold flex items-center justify-center text-sm mr-2 mt-2 self-start">
                        {getInitials(userName)}
                    </div>
                )}
                
                {/* Bubble Content */}
                <div className={`flex flex-col rounded-xl p-3 shadow-xl ${
                    isCurrentUser 
                    ? 'bg-teal-600/80 rounded-br-none text-white' // User's message (White text, Teal bubble)
                    : 'bg-indigo-700/80 rounded-tl-none text-white' // Other user's message (White text, Indigo bubble)
                }`}>
                    <p className={`text-sm font-semibold mb-1 ${isCurrentUser ? 'text-teal-100' : 'text-indigo-300'}`}>
                        {userName}
                    </p>
                    <p className="text-base break-words mt-0">{message.text}</p>
                    <span className={`text-xs mt-1 ${isCurrentUser ? 'text-teal-100/70' : 'text-gray-300/70'} self-end`}>
                        {time}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Bottom Navigation Item Component
const NavItem = ({ icon: Icon, label, isActive }) => (
  <div className={`flex flex-col items-center justify-center p-1.5 cursor-pointer transition-colors text-xs font-medium ${
    isActive ? 'text-teal-400' : 'text-white' // All inactive text/icons are white now
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

  // 4. Scroll to bottom effect
  const chatEndRef = React.useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      // Use requestAnimationFrame for smoother scroll
      requestAnimationFrame(() => {
        chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages]);


  // --- Rendering ---
  const isConnecting = !isAuthReady || !db;
  // The gate for enabling the button and sending logic
  const isReady = isAuthReady && db && userId && !error; 

  return (
    // Outer Container: Full screen height, centered content, dark background
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-start font-sans">
      
      {/* App Container - Centered and max-w for readability, fixed h-screen for mobile feel */}
      <div className="w-full max-w-3xl h-screen flex flex-col bg-gray-800 text-white shadow-2xl">

        {/* 1. Header (Top Bar) */}
        <header className="flex flex-col items-center p-4 bg-zinc-900 border-b border-gray-700/50 shadow-lg sticky top-0 z-10">
          <Phone size={28} className="text-teal-400 mb-2" />
          {/* Title is explicitly white */}
          <h1 className="text-3xl font-extrabold text-white tracking-wider">SafeTap</h1>
          {/* Subtitle is explicitly white */}
          <span className="text-sm font-light text-white mt-1">ONE TAP TO SAFETY</span>
           
            {/* Connection Status and User ID Display */}
            <div className="mt-2 text-center text-xs font-mono p-1 rounded w-full max-w-md">
                {error ? (
                     <span className="text-red-400 font-bold flex items-center justify-center">
                         <AlertTriangle size={16} className="mr-1"/> Connection Error: See console
                     </span>
                ) : isConnecting ? (
                    <span className="text-yellow-400">Connecting to Firebase...</span>
                ) : (
                    <span className="text-green-400">Chat Live | ID: {userId}</span>
                )}
            </div>
        </header>
        
        {/* 2. Main Content Area (Chat Area) */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col bg-blue-950 custom-scrollbar">
            {/* Heading is explicitly white */}
            <h2 className="text-xl font-bold text-white mb-6 text-center border-b border-teal-500/30 pb-2">Public Community Chat</h2>
            
            {/* Display Messages */}
            {isConnecting ? (
                <p className="text-yellow-500 text-center mt-12 text-lg">Loading chat history...</p>
            ) : messages.length === 0 ? (
              <p className="text-gray-400 italic text-center mt-12 text-lg">Be the first to start a conversation!</p>
            ) : (
              <div className="space-y-6 pt-2">
                {messages.map((msg, index) => (
                  <ChatBubble 
                    key={msg.id || index} 
                    message={msg} 
                    isCurrentUser={msg.senderId === userId}
                    userName={msg.senderId === userId ? 'You' : msg.senderName || 'Stranger'}
                  />
                ))}
                {/* Scroll anchor */}
                <div ref={chatEndRef} />
              </div>
            )}
            
        </main>

        {/* 3. Input Bar */}
        <div className="p-4 bg-zinc-900 border-t border-gray-700/50 flex items-center space-x-3">
          <input
            type="text"
            // Input background is white and text is black, as requested.
            className="flex-1 p-3 bg-white rounded-full text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
            placeholder={isConnecting ? "Connecting... Type now, send when ready." : "Send a message to the community..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            // CRITICAL FIX: The input is no longer disabled, allowing the user to type immediately.
            onKeyDown={(e) => { 
                // Only send if the Enter key is pressed AND the app is ready AND there is text
                if (e.key === 'Enter' && isReady && newMessage.trim() !== '') {
                    e.preventDefault(); 
                    handleSendMessage();
                }
            }}
            // IMPORTANT: Removed the `disabled` prop here to allow typing immediately
          />
          <button
            onClick={handleSendMessage}
            className="p-3 bg-teal-500 text-white rounded-full shadow-lg hover:bg-teal-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            // Button is disabled until connected AND text is present
            disabled={!isReady || newMessage.trim() === ''}
          >
            {/* Send icon is white */}
            <Send size={24} />
          </button>
        </div>

        {/* 4. Bottom Nav */}
        <nav className="flex justify-around p-3 bg-zinc-900 border-t border-gray-700/50">
          <NavItem icon={Home} label="Home" isActive={true} />
          <NavItem icon={MapPin} label="Live Loc" isActive={false} />
          <NavItem icon={AlertTriangle} label="Panic" isActive={false} />
          <NavItem icon={Speaker} label="Fake Screen" isActive={false} />
          <NavItem icon={Video} label="SOS" isActive={false} />
          <NavItem icon={Phone} label="Recording" isActive={false} /> 
        </nav>

      </div>
    </div>
  );
};

export default App;

