import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '../../components/common';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Bot, Send, User, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hello! I am your Private Hospital AI Assistant. You can tell me about your symptoms, ask medical questions, or get advice on which department to book an appointment for. How can I help you today?" }
  ]);
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
      const res = await api.post('/ai/chat', { prompt: userMessage.text });
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
    } catch (err) {
      toast.error("AI server is offline.");
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I am currently offline. Please make sure the local Ollama server is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px]">
      <PageHeader 
        title="AI Symptom Checker & Assistant" 
        subtitle="Get instant, private answers to your medical queries using Local AI"
      />

      {/* Disclaimers */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm flex gap-3">
          <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-yellow-800">Important Disclaimer</p>
            <p className="text-xs text-yellow-700 mt-1">This AI is for informational purposes only. It is not a replacement for professional medical diagnosis. In emergencies, call an ambulance immediately.</p>
          </div>
        </div>

        {/* Privacy Badge for Ollama */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm flex gap-3">
          <ShieldCheck className="text-green-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-green-900">100% Data Privacy</p>
            <p className="text-xs text-green-800 mt-1">This AI runs entirely locally on hospital servers. Your medical queries are never sent to the cloud, Google, or OpenAI.</p>
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
            <h2 className="font-bold">MediCare AI</h2>
            <p className="text-xs text-teal-200 font-medium flex items-center gap-1">
              <Sparkles size={12} /> Powered by Local Llama 3
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
                  // 🔥 FIXED: Wrapped ReactMarkdown inside a normal div!
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
            placeholder="Type your symptoms or medical questions here..."
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