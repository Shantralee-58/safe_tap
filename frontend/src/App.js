import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { ReactComponent as PhoneIcon } from "./icons/phone.svg";
import { ReactComponent as SendIcon } from "./icons/send.svg";
import { ReactComponent as HomeIcon } from "./icons/home.svg";
import { ReactComponent as LocationIcon } from "./icons/location.svg";
import { ReactComponent as PanicIcon } from "./icons/panic.svg";
import { ReactComponent as FakeIcon } from "./icons/fake.svg";
import { ReactComponent as RecordIcon } from "./icons/record.svg";

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <PhoneIcon className="phone-icon" />
          <div>
            <div className="title">SafeTap</div>
            <div className="subtitle">ONE TAP TO SAFETY</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MessageBubble({ text, time, from }) {
  const isMe = from === "me";
  return (
    <div className={`bubble-row ${isMe ? "me" : "them"}`}>
      {!isMe && <div className="avatar">J</div>}
      <div className={`bubble ${isMe ? "bubble-me" : "bubble-them"}`}>
        <div className="bubble-name">{!isMe ? (from || "John Doe") : ""}</div>
        <div className="bubble-text">{text}</div>
        <div className="bubble-time">{time}</div>
      </div>
      {isMe && <div className="spacer" />}
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <button className="nav-btn"><HomeIcon /></button>
      <button className="nav-btn"><LocationIcon /></button>
      <button className="nav-btn"><PanicIcon /></button>
      <button className="nav-btn"><FakeIcon /></button>
      <button className="nav-btn"><RecordIcon /></button>
    </nav>
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey everyone! How is everyone doing?", time: "10:30 AM", from: "John Doe" },
    { id: 2, text: "I'm doing great! Just finished the project.", time: "10:32 AM", from: "me" },
    { id: 3, text: "That's awesome! Can you share the details?", time: "10:33 AM", from: "Jane Smith" },
    { id: 4, text: "Sure! I'll send it over shortly.", time: "10:35 AM", from: "me" },
  ]);
  const [text, setText] = useState("");
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!text.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { id: Date.now(), text: text.trim(), time, from: "me" }]);
    setText("");
  }

  function handleKey(e) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div className="app">
      <Header />
      <main className="chat-area">
        <h3 className="chat-title">Chat Area</h3>
        <div className="messages">
          {messages.map((m) => (
            <MessageBubble key={m.id} text={m.text} time={m.time} from={m.from} />
          ))}
          <div ref={scrollRef} />
        </div>

        <div className="composer">
          <input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            className="composer-input"
          />
          <button className="send-btn" onClick={handleSend} aria-label="send"><SendIcon /></button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

