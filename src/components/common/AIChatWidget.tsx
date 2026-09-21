import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User } from "lucide-react";
import { startResearchChat } from "@/lib/ai";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "init",
    role: "model",
    text: "Hi there! I am the Thesis Crew Research Advisor. How can I help you with your academic work today?"
  }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !chatSession) {
      try {
        const session = startResearchChat();
        setChatSession(session);
      } catch (err) {
        console.error("Failed to initialize chat session:", err);
      }
    }
  }, [isOpen, chatSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !chatSession) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message immediately
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: userMessage };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessage(userMessage);
      const responseText = result.response.text();
      
      const newModelMsg: ChatMessage = { id: Date.now().toString() + "-model", role: "model", text: responseText };
      setMessages(prev => [...prev, newModelMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { 
        id: Date.now().toString() + "-error", 
        role: "model", 
        text: "Sorry, I'm having trouble connecting right now. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderText = (text: string) => {
    // Simple markdown-like rendering for bold text and newlines
    return text.split("\n").map((line, i) => {
      // Bold text handling
      const parts = line.split(/(\*\*.*?\*\*)/g);
      
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={j} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
          {i !== text.split("\n").length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:shadow-blue-500/60 active:scale-95"
          aria-label="Open AI Research Chat"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[350px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10 transition-all duration-300 dark:border-[#2A2A2A] dark:bg-[#121212] sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Research Advisor</h3>
                <p className="text-[10px] text-slate-500">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-[#222222] dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[85%] gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      msg.role === "user"
                        ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-700 dark:bg-[#181818] dark:text-slate-300 rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "user" ? msg.text : renderText(msg.text)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start transition-all duration-300">
                <div className="flex max-w-[85%] gap-2 flex-row">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Bot className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 dark:bg-[#181818]">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0ms" }}></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }}></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-100 p-3 dark:border-[#2A2A2A]">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 pl-3 transition-colors focus-within:border-blue-500 dark:border-[#2A2A2A] dark:bg-[#181818] dark:focus-within:border-blue-500/50"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about research..."
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 dark:text-white"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
