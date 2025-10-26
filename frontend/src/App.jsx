import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// --- Icon Imports (Using lucide-react to match the design) ---
import { 
  Home, MapPin, ShieldAlert, EyeOff, Video, 
  PhoneCall, Mic, Send, X, AlertCircle, MessageSquare 
} from 'lucide-react';

// --- FIREBASE IMPORTS (REQUIRED FOR PERSISTENT DATA) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

// --- INITIAL CONFIGURATION AND CONTEXT ---

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Context for Firebase and User State
const AppContext = createContext();

const chatDataMock = [
  { id: 1, sender: 'John Doe', time: '10:30 AM', content: 'Hey everyone! How is everyone doing?', isMine: false, initial: 'J' },
  { id: 2, sender: 'You', time: '10:32 AM', content: "I'm doing great! Just finished the project.", isMine: true, initial: 'Y' },
  { id: 3, sender: 'Jane Smith', time: '10:33 AM', content: "That's awesome! Can you share the details?", isMine: false, initial: 'J' },
  { id: 4, sender: 'You', time: '10:35 AM', content: "Sure! I'll send it over shortly.", isMine: true, initial: 'Y' },
];

/**
 * Global State Provider to initialize Firebase and manage global state.
 */
const AppProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [chatMessages, setChatMessages] = useState(chatDataMock);
  const [isRecording, setIsRecording] = useState(false); 
  const [isPanicActive, setIsPanicActive] = useState(false); 

  // Initialization and side effects (Firestore setup, etc. - kept for completeness)
  useEffect(() => {
    // [Firebase initialization and authentication logic remains here]
    try {
      if (Object.keys(firebaseConfig).length === 0) {
        console.warn("Firebase config is missing. Running in mock mode.");
        setIsAuthReady(true);
        return;
      }
      
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const userAuth = getAuth(app);
      setDb(firestore);
      setAuth(userAuth);

      onAuthStateChanged(userAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          if (initialAuthToken) {
            signInWithCustomToken(userAuth, initialAuthToken)
              .catch(e => {
                console.error("Custom token sign-in failed:", e);
                signInAnonymously(userAuth);
              });
          } else {
            signInAnonymously(userAuth);
          }
        }
        setIsAuthReady(true);
      });
      
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      setIsAuthReady(true);
    }
  }, [initialAuthToken]);

  // Chat listener (Placeholder)
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;
    // [Firestore chat listener logic remains here]
    const messagesCollectionRef = collection(doc(db, 'artifacts', appId, 'users', userId), 'chat_messages');
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Logic to handle new messages
    }, (error) => {
      console.error("Firestore chat listener failed: ", error);
    });
    return () => unsubscribe();
  }, [db, userId, isAuthReady]);

  // Function to send a message (Placeholder)
  const sendMessage = useCallback(async (content) => {
    if (!db || !userId || content.trim() === '') {
      // Fallback for mock mode
      const newMessage = {
        id: Date.now(),
        sender: 'You',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: content,
        isMine: true,
        initial: 'Y',
      };
      setChatMessages(prev => [...prev, newMessage]);
      return;
    }

    try {
      // [Firestore message sending logic remains here]
      const groupChatDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'group_chat', 'group_1');
      const messagesCollectionRef = collection(groupChatDocRef, 'messages');
      await setDoc(doc(messagesCollectionRef), {
        senderId: userId,
        content: content,
        timestamp: new Date(),
        senderName: 'Your Name Placeholder',
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }, [db, userId]);

  // Safety functions
  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
    console.log(`Recording status set to: ${!isRecording}`);
  }, [isRecording]);

  const togglePanic = useCallback(() => {
    if (isPanicActive) {
      setIsPanicActive(false);
      console.log('Panic alert resolved.');
    } else {
      setIsPanicActive(true);
      console.log('Panic alert initiated! Contacts notified.');
    }
  }, [isPanicActive]);

  return (
    <AppContext.Provider value={{
      db, auth, userId, isAuthReady, chatMessages, sendMessage,
      isRecording, toggleRecording, isPanicActive, togglePanic,
    }}>
      {children}
    </AppContext.Provider>
  );
};

// --- UI COMPONENTS ---

const MessageBubble = ({ message }) => {
  const alignment = message.isMine ? 'justify-end' : 'justify-start';
  const bubbleColor = message.isMine ? 'bg-cyan-600/90' : 'bg-blue-800/80';
  const timeAlignment = message.isMine ? 'text-right' : 'text-left';

  return (
    <div className={`flex w-full mb-3 ${alignment}`}>
      <div className={`flex max-w-sm ${message.isMine ? 'flex-row-reverse' : 'flex-row'} items-end`}>
        {/* User Initial Avatar */}
        <div className={`w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-lg ${message.isMine ? 'ml-2' : 'mr-2'}`}>
            {message.initial}
        </div>
        
        <div className="flex flex-col">
          {/* Sender Name (Only for non-user messages) */}
          {!message.isMine && (
            <div className="text-xs text-blue-300 mb-0.5 ml-2 font-medium">{message.sender}</div>
          )}
          
          <div className={`rounded-xl px-4 py-2 shadow-lg text-white ${bubbleColor}`}>
            {message.content}
            <p className={`text-[10px] text-gray-300/70 mt-1 ${timeAlignment}`}>
              {message.time}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatArea = ({ messages }) => {
  const { isPanicActive } = useContext(AppContext);
  const messagesEndRef = useRef(null);
  
  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-blue-950/80">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h2 className="text-xl font-bold text-white mb-6">Chat Area</h2>
        {isPanicActive && (
            <div className="p-3 mb-4 bg-red-800 rounded-lg text-white font-semibold flex items-center justify-center">
                <AlertCircle className="w-5 h-5 mr-2 animate-pulse"/>
                PANIC ALERT ACTIVE: Location is being shared.
            </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

const ChatInput = () => {
  const [input, setInput] = useState('');
  const { sendMessage } = useContext(AppContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-blue-950 shadow-inner border-t border-blue-800">
      <div className="flex items-center space-x-3 bg-blue-900 rounded-full py-2 px-4 shadow-xl border border-blue-700/50">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-base"
        />
        <button
          type="submit"
          className="p-2 rounded-full bg-blue-500 hover:bg-blue-400 transition shadow-lg"
          aria-label="Send message"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </form>
  );
};

// --- Desktop Sidebar Navigation ---

const NavItem = ({ icon: Icon, name, page, currentPage, setCurrentPage, isPanicActive }) => {
  const isActive = page === currentPage;
  
  // Highlight SOS/Panic icon if panic is active
  let iconColor = isActive ? 'text-cyan-400' : 'text-gray-400';
  let bgColor = isActive ? 'bg-blue-900' : 'hover:bg-blue-900/50';

  if (page === 'panic' && isPanicActive) {
    iconColor = 'text-red-500 animate-pulse';
  } else if (page === 'sos' && isPanicActive) {
    iconColor = 'text-red-500 animate-pulse';
  }

  return (
    <div
      className={`flex flex-col items-center p-3 rounded-xl transition-all w-full cursor-pointer ${bgColor}`}
      onClick={() => setCurrentPage(page)}
      role="button"
      tabIndex="0"
      title={name}
    >
      <Icon className={`w-7 h-7 ${iconColor}`} />
      <span className={`text-[10px] mt-1 ${iconColor} font-medium`}>{name}</span>
    </div>
  );
};

const LeftSidebar = ({ currentPage, setCurrentPage }) => {
  const { isPanicActive } = useContext(AppContext);
  
  // Items matching the screenshot and adding the Chat/Message icon
  const items = [
    { name: 'Home', icon: Home, page: 'home' },
    { name: 'Chat', icon: MessageSquare, page: 'chat' },
    { name: 'Live Loc...', icon: MapPin, page: 'location' },
    { name: 'Panic', icon: AlertCircle, page: 'panic' },
    { name: 'Fake Screen', icon: EyeOff, page: 'fake' },
    { name: 'SOS', icon: ShieldAlert, page: 'sos' },
    { name: 'Recording', icon: Video, page: 'recording' },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-20 bg-blue-950/90 border-r border-blue-800 shadow-2xl z-20 pt-4">
      <div className="flex flex-col items-center space-y-4">
        {items.map(item => (
          <NavItem 
            key={item.name} 
            item={item} 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            icon={item.icon}
            name={item.name}
            page={item.page}
            isPanicActive={isPanicActive}
          />
        ))}
      </div>
    </div>
  );
};

// --- Placeholder Screens (Unchanged but adapted to full-screen h-full) ---

const HomeScreen = ({ userId, isPanicActive }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-white bg-blue-950/80">
    <Home className="w-16 h-16 text-blue-400 mb-6" />
    <h2 className="text-2xl font-bold mb-2">Welcome to SafeTap</h2>
    <p className="text-gray-400 text-center mb-6">Your security companion. User ID: {userId || 'N/A'}</p>
    {isPanicActive && (
        <div className="mt-8 p-4 bg-red-800 rounded-xl shadow-2xl flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-300 mr-3 animate-pulse"/>
            <p className="text-lg font-semibold text-yellow-200">PANIC ALERT ACTIVE!</p>
        </div>
    )}
  </div>
);

const SOSScreen = ({ isPanicActive, togglePanic }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-white bg-blue-950/80">
    <ShieldAlert className={`w-20 h-20 mb-8 ${isPanicActive ? 'text-red-500' : 'text-blue-500'}`} />
    <h2 className="text-3xl font-extrabold mb-8">{isPanicActive ? 'EMERGENCY ACTIVE' : 'SOS & Panic Controls'}</h2>
    
    <button
      onClick={togglePanic}
      className={`w-full max-w-sm py-4 rounded-full font-bold text-xl transition-all shadow-2xl ${
        isPanicActive 
          ? 'bg-red-600 hover:bg-red-700 text-white' 
          : 'bg-green-500 hover:bg-green-600 text-white'
      }`}
    >
      {isPanicActive ? (
        <span className="flex items-center justify-center">
          <X className="w-6 h-6 mr-2" /> STOP ALERT
        </span>
      ) : (
        <span className="flex items-center justify-center">
          <PhoneCall className="w-6 h-6 mr-2" /> INITIATE SOS
        </span>
      )}
    </button>
  </div>
);

const RecordingScreen = ({ isRecording, toggleRecording }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-white bg-blue-950/80">
    <Video className={`w-20 h-20 mb-8 ${isRecording ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
    <h2 className="text-3xl font-extrabold mb-8">{isRecording ? 'RECORDING LIVE...' : 'Audio/Video Capture'}</h2>
    
    <button
      onClick={toggleRecording}
      className={`w-full max-w-sm py-4 rounded-full font-bold text-xl transition-all shadow-2xl ${
        isRecording 
          ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900' 
          : 'bg-green-500 hover:bg-green-600 text-white'
      }`}
    >
      <span className="flex items-center justify-center">
        <Mic className="w-6 h-6 mr-2" /> {isRecording ? 'STOP RECORDING' : 'START RECORDING'}
      </span>
    </button>
  </div>
);


/**
 * Main application component.
 */
const AppContent = () => {
  const { chatMessages, userId, isPanicActive, togglePanic, isRecording, toggleRecording } = useContext(AppContext);
  const [currentPage, setCurrentPage] = useState('chat'); // 'chat' is the default view

  // Conditional Rendering based on navigation state
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomeScreen userId={userId} isPanicActive={isPanicActive} />;
      case 'location':
        return <div className="p-8 text-white text-center bg-blue-950/80 h-full flex flex-col items-center justify-center">
            <MapPin className="w-16 h-16 mx-auto text-blue-500 mb-4"/>
            <h2 className="text-2xl font-bold mb-4">Live Location Tracking</h2>
            <p className="text-gray-400">Placeholder for the real-time map showing location of group members.</p>
        </div>;
      case 'panic':
      case 'sos':
        return <SOSScreen isPanicActive={isPanicActive} togglePanic={togglePanic} />;
      case 'fake':
        return <div className="p-8 text-white text-center bg-blue-950/80 h-full flex flex-col items-center justify-center">
            <EyeOff className="w-16 h-16 mx-auto text-yellow-500 mb-4"/>
            <h2 className="text-2xl font-bold mb-4">Fake Screen Mode</h2>
            <p className="text-gray-400">Displays an innocuous interface to hide the app's true functionality.</p>
        </div>;
      case 'recording':
        return <RecordingScreen isRecording={isRecording} toggleRecording={toggleRecording} />;
      case 'chat':
      default:
        return <ChatArea messages={chatMessages} />;
    }
  };

  const isChatView = currentPage === 'chat';

  return (
    <div className="flex h-screen w-screen bg-[#1E293B] font-sans">
      {/* 1. Left Sidebar Navigation */}
      <LeftSidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* 2. Main Content Area */}
      <div className="flex flex-col flex-1 ml-20"> {/* ml-20 pushes content past the sidebar */}
        
        {/* Header */}
        <header className="py-3 px-6 bg-blue-900 shadow-xl sticky top-0 z-10 border-b border-blue-800">
          <div className="flex items-center">
            <PhoneCall className="w-6 h-6 text-white mr-3" />
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-wider">SafeTap</h1>
              <p className="text-xs text-cyan-400 font-semibold uppercase">ONE TAP TO SAFETY</p>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-hidden">
          <div className={`flex flex-col h-full ${isChatView ? '' : 'justify-center'}`}>
            <div className={`flex-1 overflow-y-auto ${isChatView ? '' : 'flex flex-col'}`}>
              {renderPage()}
            </div>
            
            {/* Chat Input (Only visible on Chat screen) */}
            {isChatView && <ChatInput />}
          </div>
        </div>
      </div>
    </div>
  );
};

// The main export wraps the content in the provider
export default function App() {
  return (
    <AppProvider>
      <style>
        {`
          /* Custom Scrollbar for dark theme */
          ::-webkit-scrollbar {
              width: 8px;
          }

          ::-webkit-scrollbar-track {
              background: #101927;
          }

          ::-webkit-scrollbar-thumb {
              background: #374151;
              border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
              background: #4b5563;
          }
        `}
      </style>
      <AppContent />
    </AppProvider>
  );
}

