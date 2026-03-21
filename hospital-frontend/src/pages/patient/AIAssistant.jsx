import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Bot, Send, User, Sparkles, AlertTriangle, CalendarDays } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hello! I am your Autonomous Medical Agent. You can tell me your symptoms, and I can directly check doctor availability and book an appointment for you! How can I help you today?" }
  ]);
  
  // 🔥 REQUIRED FOR GEMINI: Stores the conversational history so the AI remembers the context
  const [chatHistory, setChatHistory] = useState([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send both the prompt AND the history to the backend
      const res = await api.post('/ai/chat', { 
        prompt: userMessage.text,
        history: chatHistory
      });
      
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
      
      // Update the history with the backend's response so Gemini doesn't forget
      if (res.data.history) {
        setChatHistory(res.data.history);
      }
    } catch (err) {
      toast.error("AI server error.");
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I am having trouble connecting to the booking system right now. Please try again in a few seconds." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px]">
      <PageHeader 
        title="Autonomous AI Agent" 
        subtitle="Chat with AI to instantly triage symptoms and book your appointments"
      />

      {/* Disclaimers & Info Badges */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm flex gap-3">
          <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-yellow-800">Important Disclaimer</p>
            <p className="text-xs text-yellow-700 mt-1">This AI is for informational and booking purposes only. It is not a replacement for professional medical diagnosis. In emergencies, call an ambulance immediately.</p>
          </div>
        </div>

        {/* Updated Badge for Smart Auto-Booking */}
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg shadow-sm flex gap-3">
          <CalendarDays className="text-teal-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-teal-900">Smart Auto-Booking</p>
            <p className="text-xs text-teal-800 mt-1">This agent is connected directly to the hospital database. It can check doctor schedules and seamlessly book appointments for you in this chat.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        
        {/* Chat Header */}
        <div className="bg-teal-700 p-4 flex items-center gap-3 text-white">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Bot size={20} className="text-teal-50" />
          </div>
          <div>
            <h2 className="font-bold">MediCare AI Agent</h2>
            <p className="text-xs text-teal-200 font-medium flex items-center gap-1">
              <Sparkles size={12} /> Powered by Gemini 2.5 Flash
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700 border border-teal-200'}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={18} />}
              </div>
              
              <div className={`p-4 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 shadow-sm rounded-tl-none leading-relaxed'}`}>
                {msg.sender === 'user' ? (
                  msg.text
                ) : (
                  <div className="prose prose-sm prose-teal max-w-none">
                    <ReactMarkdown>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 mt-1">
                <Bot size={18} />
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all bg-gray-50 hover:bg-white"
            placeholder="Tell me your symptoms or ask to book an appointment..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={18} className={input.trim() && !loading ? "translate-x-0.5 transition-transform" : ""} />
          </button>
        </form>

      </div>
    </div>
  );
}