/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sparkles,
  Wallet,
  Trophy,
  History,
  Ticket,
  BarChart2,
  Shield,
  Volume2,
  VolumeX,
  Users,
  Award,
} from 'lucide-react';
import { formatCurrency } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';

export type ActiveTab =
  | 'lobby'
  | 'draw_studio'
  | 'buy_ticket'
  | 'my_tickets'
  | 'results'
  | 'wallet'
  | 'stats'
  | 'missions'
  | 'leaderboard'
  | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  balance: number;
  userName: string;
  userAvatar: string;
  onlineCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  unreadWonTickets: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  balance,
  userName,
  userAvatar,
  onlineCount,
  isMuted,
  onToggleMute,
  unreadWonTickets,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'lobby', label: 'Sảnh Xổ Số', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'draw_studio', label: 'Phòng Quay 3D', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { id: 'buy_ticket', label: 'Mua Vé Số', icon: <Ticket className="w-4 h-4 text-emerald-400" /> },
    { id: 'my_tickets', label: 'Vé Của Tôi', icon: <Ticket className="w-4 h-4" />, badge: unreadWonTickets },
    { id: 'results', label: 'Kết Quả & Lịch Sử', icon: <History className="w-4 h-4" /> },
    { id: 'wallet', label: 'Ví Tiền Ảo', icon: <Wallet className="w-4 h-4 text-amber-300" /> },
    { id: 'stats', label: 'Thống Kê', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'missions', label: 'Nhiệm Vụ', icon: <Award className="w-4 h-4 text-yellow-400" /> },
    { id: 'leaderboard', label: 'Xếp Hạng', icon: <Users className="w-4 h-4" /> },
    { id: 'admin', label: 'Quản Trị', icon: <Shield className="w-4 h-4 text-rose-400" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 border-b border-slate-800 backdrop-blur-md">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => {
            sound.playClick();
            setActiveTab('lobby');
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <span className="text-xl font-black text-slate-950">N3D</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                NORAT LOTTERY 3D
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                PROVABLY FAIR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Hệ thống xổ số mô phỏng 3D thời gian thực • Tiền ảo giải trí
            </p>
          </div>
        </div>

        {/* User Stats & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Virtual Wallet Pill */}
          <div
            onClick={() => {
              sound.playClick();
              setActiveTab('wallet');
            }}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-amber-500/40 hover:border-amber-400/80 cursor-pointer transition-all shadow-md group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Ví ảo</div>
              <div className="text-xs sm:text-sm font-black text-amber-400 font-mono tracking-tight group-hover:text-amber-300">
                {formatCurrency(balance)}
              </div>
            </div>
          </div>

          {/* Online Players indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{onlineCount} đang online</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleMute();
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Profile Badge */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
            <span className="text-xl" title={userName}>
              {userAvatar}
            </span>
            <span className="text-xs font-semibold text-slate-300 hidden lg:inline max-w-[100px] truncate">
              {userName}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="w-full bg-slate-900/80 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(item.id);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all relative ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-400/10 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-500 text-[10px] text-white font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
