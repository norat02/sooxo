/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameId, LotteryRound, LotteryTicket } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import { formatCurrency, formatNumber } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import {
  Sparkles,
  Trophy,
  Ticket,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Zap,
  Info,
  Gift,
} from 'lucide-react';

interface LobbyViewProps {
  rounds: Record<GameId, LotteryRound>;
  onSelectGameAndTab: (gameId: GameId, tab: 'draw_studio' | 'buy_ticket') => void;
  recentResults: LotteryRound[];
  onOpenRules: (gameId: GameId) => void;
  onlineCount: number;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  rounds,
  onSelectGameAndTab,
  recentResults,
  onOpenRules,
  onlineCount,
}) => {
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>MÔ PHỎNG XỔ SỐ 3D ĐẲNG CẤP • MINH BẠCH 100%</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight leading-tight">
            Sảnh Xổ Số 3D Thời Gian Thực{' '}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              NORAT LOTTERY
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Trải nghiệm công nghệ máy quay xổ số vật lý 3D chân thực, thuật toán Provably Fair mã hóa SHA-256
            bảo đảm công bằng tuyệt đối. Tự do thử vận may với 5 loại hình xổ số đỉnh cao!
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                sound.playClick();
                onSelectGameAndTab('mega645', 'draw_studio');
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-transform active:scale-95 flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>VÀO PHÒNG QUAY 3D NGAY</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onSelectGameAndTab('power655', 'buy_ticket');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition-colors flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span>Mua vé số may mắn</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Lottery Games Showcase Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Các Trò Chơi Xổ Số Đang Diễn Ra
            </h2>
            <p className="text-xs text-slate-400">
              Chọn trò chơi yêu thích để tham gia quay số hoặc mua vé số
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(Object.keys(LOTTERY_GAMES) as GameId[]).map((gid) => {
            const g = LOTTERY_GAMES[gid];
            const round = rounds[gid];
            const isDrawing = round?.status === 'drawing';
            const secondsToClose = round
              ? Math.max(0, Math.floor((round.closeTime - now) / 1000))
              : 0;
            const jackpot = round?.jackpotPool || g.prizeTiers[0].basePrize;

            return (
              <div
                key={gid}
                className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Header Row */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg text-slate-100 group-hover:text-amber-400 transition-colors">
                          {g.name}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${g.colorScheme.badgeBg}`}>
                          {g.pickCount}/{g.totalBalls}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{g.subtitle}</p>
                    </div>

                    <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
                      {formatCurrency(g.ticketPrice)}
                    </span>
                  </div>

                  {/* Jackpot Prize Display */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                      <span>Quỹ giải thưởng Jackpot</span>
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-xl font-black text-amber-400 font-mono tracking-tight">
                      {formatCurrency(jackpot)}
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div className="mt-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Kỳ {round?.id}:
                    </span>
                    <span className="font-bold">
                      {isDrawing ? (
                        <span className="text-amber-400 animate-pulse">ĐANG QUAY SỐ</span>
                      ) : secondsToClose > 0 ? (
                        <span className="text-emerald-400">Đóng cổng sau {secondsToClose}s</span>
                      ) : (
                        <span className="text-rose-400">Đang chuẩn bị quay</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      onSelectGameAndTab(gid, 'draw_studio');
                    }}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Xem 3D</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      onSelectGameAndTab(gid, 'buy_ticket');
                    }}
                    className="py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 text-xs font-black shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Mua vé</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Winning Results Showcase */}
      {recentResults.length > 0 && (
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Kết Quả Các Kỳ Quay Vừa Hoàn Thành
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentResults.slice(0, 3).map((r) => {
              const game = LOTTERY_GAMES[r.gameId];
              return (
                <div
                  key={r.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-200">{game.name}</span>
                    <div className="text-[10px] text-slate-500 font-mono">#{r.id}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    {r.winningNumbers.map((n, i) => (
                      <span
                        key={i}
                        className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs font-mono flex items-center justify-center"
                      >
                        {formatNumber(n)}
                      </span>
                    ))}
                    {r.specialNumber !== undefined && (
                      <span
                        className="w-7 h-7 rounded-full bg-rose-500 text-white font-bold text-xs font-mono flex items-center justify-center ml-1"
                        title="Bóng đặc biệt"
                      >
                        {formatNumber(r.specialNumber)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
