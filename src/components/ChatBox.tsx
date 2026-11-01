/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/lottery';
import { sound } from '../utils/soundEngine';
import { MessageSquare, Send, Sparkles, Smile } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  userName: string;
  userAvatar: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  userName,
  userAvatar,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPhrases = ['Chúc mừng nha! 🎉', 'Xin vía trúng Jackpot! ✨', 'Quá đỉnh luôn! 🔥', 'Số đẹp quá! 🍀'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sound.playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl flex flex-col h-full max-h-[500px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <MessageSquare className="w-4 h-4" />
          <span>Kênh Chat Trực Tiếp</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Thời gian thực</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs scrollbar-thin">
        {messages.map((m) => {
          const isSystem = m.type === 'system';
          const isJackpot = m.type === 'jackpot';
          const isMe = m.userName === userName;

          if (isJackpot) {
            return (
              <div
                key={m.id}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 text-amber-300 font-medium text-center space-y-0.5 shadow-sm"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>THÔNG BÁO TRÚNG THƯỞNG</span>
                </div>
                <p className="text-[11px] text-slate-200">{m.text}</p>
              </div>
            );
          }

          if (isSystem) {
            return (
              <div
                key={m.id}
                className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] text-center"
              >
                {m.text}
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <span className="text-base shrink-0">{m.userAvatar || '🧑'}</span>
              <div
                className={`max-w-[75%] p-2 rounded-xl text-xs space-y-0.5 ${
                  isMe
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div
                  className={`text-[10px] font-bold ${
                    isMe ? 'text-slate-900' : 'text-amber-400'
                  }`}
                >
                  {m.userName}
                </div>
                <div className="break-words leading-relaxed">{m.text}</div>
                <div
                  className={`text-[9px] text-right font-mono ${
                    isMe ? 'text-slate-800' : 'text-slate-500'
                  }`}
                >
                  {new Date(m.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick reaction chips */}
      <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {quickPhrases.map((phrase, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(phrase)}
            className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap transition-colors"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          maxLength={150}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50 transition-colors shadow-sm"
          title="Gửi tin nhắn"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
