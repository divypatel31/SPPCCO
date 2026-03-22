import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Bot, Send, User, Sparkles, AlertTriangle, CalendarDays } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

const FADE_UP_SPRING = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.8 } }
};

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hello! I am your Autonomous Medical Agent. You can tell me your symptoms, and I can directly check doctor availability and book an appointment for you! How can I help you today?" }
  ]);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput(''); setLoading(true);

    try {
      const res = await api.post('/ai/chat', { prompt: userMessage.text, history: chatHistory });
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
      if (res.data.history) setChatHistory(res.data.history);
    } catch (err) {
      toast.error("AI server error.");
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I am having trouble connecting to the booking system right now. Please try again in a few seconds." }]);
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="flex flex-col h-[calc(100vh-120px)] max-h-[900px] max-w-[1000px] mx-auto p-4 sm:p-8 font-sans">
      
      <motion.div variants={FADE_UP_SPRING} className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Health Assistant AI</h1>
        <p className="text-slate-500 font-medium mt-1">Chat intelligently to triage symptoms and auto-book consultations.</p>
      </motion.div>

      {/* Disclaimers */}
      <motion.div variants={FADE_UP_SPRING} className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl flex gap-3 shadow-sm">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-[13px] font-semibold text-amber-900">Medical Disclaimer</p>
            <p className="text-xs text-amber-700/80 mt-1 font-medium leading-relaxed">This AI is for informational and booking purposes only. It is not a replacement for professional diagnosis.</p>
          </div>
        </div>
        <div className="bg-sky-50/50 border border-sky-200/60 p-4 rounded-2xl flex gap-3 shadow-sm">
          <CalendarDays className="text-sky-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-[13px] font-semibold text-sky-900">Autonomous Booking</p>
            <p className="text-xs text-sky-700/80 mt-1 font-medium leading-relaxed">Connected directly to the hospital database, this agent can check schedules and book appointments seamlessly.</p>
          </div>
        </div>
      </motion.div>

      {/* Chat Container */}
      <motion.div variants={FADE_UP_SPRING} className="flex-1 bg-white rounded-[24px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col overflow-hidden">
        
        {/* Chat Header */}
        <div className="bg-slate-50/80 p-5 flex items-center gap-3 border-b border-slate-100">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
            <Bot size={20} className="text-sky-500" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 tracking-tight text-sm">MediCare AI Interface</h2>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest flex items-center gap-1 mt-0.5">
              <Sparkles size={10} className="text-amber-400"/> System Online
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
          {messages.map((msg, idx) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${msg.sender === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-sky-600 border border-slate-200/60'}`}>
                {msg.sender === 'user' ? <User size={14} /> : <Bot size={16} />}
              </div>
              
              <div className={`p-4 text-[13px] font-medium leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-sky-500 text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-slate-200/60 text-slate-700 rounded-2xl rounded-tl-sm'}`}>
                {msg.sender === 'user' ? msg.text : (
                  <div className="prose prose-sm prose-sky max-w-none prose-p:my-1 prose-headings:mb-2 prose-headings:mt-4">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-white text-sky-600 border border-slate-200/60 shadow-sm flex items-center justify-center shrink-0 mt-1"><Bot size={16} /></div>
              <div className="bg-white border border-slate-200/60 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <input
            type="text"
            className="flex-1 border border-slate-200/60 rounded-[16px] px-5 py-3.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 transition-all bg-slate-50 hover:bg-white placeholder:text-slate-400"
            placeholder="Describe your symptoms to initiate booking..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3.5 rounded-[16px] shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            <Send size={18} className={input.trim() && !loading ? "translate-x-0.5 transition-transform" : ""} />
          </button>
        </form>

      </motion.div>
    </motion.div>
  );
}