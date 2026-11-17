import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { UploadZone } from '../components/UploadZone';
import { AiDisclaimer } from '../components/AiDisclaimer';
import api from '../services/api';
import { MessageSquare, Send, RefreshCw, FileText, Bot, User, AlertCircle, Loader2 } from 'lucide-react';

export const PdfQA = () => {
  const [file, setFile] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingAnswer]);

  const handleUpload = async (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setUploadError('');
    setLoadingUpload(true);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await api.post('/api/pdfqa/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSession(res.data);
      setMessages([
        {
          sender: 'bot',
          text: `Document "${res.data.filename}" indexed (${res.data.page_count} pages, ${res.data.word_count.toLocaleString()} words). What would you like to know about it?`,
          citations: [],
        },
      ]);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to index PDF document.');
      setFile(null);
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !session || loadingAnswer) return;

    const userQ = question.trim();
    setQuestion('');
    setMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setLoadingAnswer(true);

    try {
      const res = await api.post('/api/pdfqa/ask', {
        session_id: session.session_id,
        question: userQ,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: res.data.answer,
          citations: res.data.cited_pages || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: err.response?.data?.detail || 'Error retrieving response from the document.',
          citations: [],
          isError: true,
        },
      ]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleReset = async () => {
    if (session) {
      try {
        await api.delete(`/api/pdfqa/session/${session.session_id}`);
      } catch (e) {
        // Handled silently
      }
    }
    setFile(null);
    setSession(null);
    setMessages([]);
    setQuestion('');
    setUploadError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <Navbar />

      <div className="flex-grow flex">
        <Sidebar />

        <main className="flex-1 p-6 lg:p-8 max-w-5xl mx-auto w-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display text-white">PDF Question & Answer</h1>
                <p className="text-xs text-slate-400">
                  Ask multiple factual questions directly from your PDF with verifiable page citations.
                </p>
              </div>
            </div>

            {session && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload New PDF</span>
              </button>
            )}
          </div>

          {!session ? (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4">
              <UploadZone
                onFileSelect={handleUpload}
                accept=".pdf"
                maxSizeMB={10}
                label="Upload PDF Document to Start Chat"
                hint="Only text-searchable PDFs accepted (Max 10MB)"
              />

              {loadingUpload && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting pages and building search index...</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl min-h-[500px]">
              {/* DOCUMENT BAR */}
              <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-200 truncate">{session.filename}</span>
                  <span>({session.page_count} pages)</span>
                </div>
                <AiDisclaimer />
              </div>

              {/* MESSAGES LIST */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[520px]">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-xl rounded-2xl p-4 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : msg.isError
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-tl-none'
                          : 'glass-panel border border-white/10 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-400">Cited Pages:</span>
                          {msg.citations.map((p) => (
                            <span
                              key={p}
                              className="text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30"
                            >
                              Page {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {loadingAnswer && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="glass-panel border border-white/10 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Searching document excerpts & composing answer...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* INPUT FORM */}
              <form onSubmit={handleAsk} className="p-4 border-t border-white/10 bg-white/[0.02]">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask anything about this PDF..."
                    disabled={loadingAnswer}
                    className="w-full glass-input rounded-xl pl-4 pr-12 py-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || loadingAnswer}
                    className="absolute right-2 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
