/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameId, LotteryRound, ChatMessage } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import { ThreeLotteryMachine } from './ThreeLotteryMachine';
import { ChatBox } from './ChatBox';
import { formatCurrency, formatNumber } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import {
  Trophy,
  Clock,
  Sparkles,
  Ticket,
  ShieldCheck,
  Radio,
  Eye,
} from 'lucide-react';

interface DrawStudioViewProps {
  selectedGameId: GameId;
  onSelectGame: (gameId: GameId) => void;
  activeRound?: LotteryRound;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  userName: string;
  userAvatar: string;
  onNavigateToShop: () => void;
  currentDrawnBall: number | null;
}

export const DrawStudioView: React.FC<DrawStudioViewProps> = ({
  selectedGameId,
  onSelectGame,
  activeRound,
  chatMessages,
  onSendMessage,
  userName,
  userAvatar,
  onNavigateToShop,
  currentDrawnBall,
}) => {
  const game = LOTTERY_GAMES[selectedGameId];
  const isDrawing = activeRound?.status === 'drawing';
  const drawnBalls = activeRound?.drawnSequence
    ? activeRound.drawnSequence.filter((d) => !d.isSpecial).map((d) => d.number)
    : [];
  const specialBall = activeRound?.drawnSequence?.find((d) => d.isSpecial)?.number;

  // Countdown seconds calculation
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsToDraw = activeRound
    ? Math.max(0, Math.floor((activeRound.drawTime - now) / 1000))
    : 0;
  const secondsToClose = activeRound
    ? Math.max(0, Math.floor((activeRound.closeTime - now) / 1000))
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Game Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(LOTTERY_GAMES) as GameId[]).map((gid) => {
          const g = LOTTERY_GAMES[gid];
          const isSelected = selectedGameId === gid;
          return (
            <button
              key={gid}
              onClick={() => {
                sound.playClick();
                onSelectGame(gid);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isSelected ? 'bg-slate-950' : 'bg-amber-400'
                }`}
              />
              <span>{g.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Studio Grid: 3D Stage + Live Digital Board + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: 3D Machine Stage */}
        <div className="lg:col-span-2 flex flex-col space-y-3">
          {/* Top Stage Billboard Banner */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-100">{game.name}</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400">
                    #{activeRound?.id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>Quỹ Jackpot:</span>
                  <strong className="text-amber-400 font-mono text-xs">
                    {formatCurrency(activeRound?.jackpotPool || game.prizeTiers[0].basePrize)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Countdown / Status Box */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isDrawing
                    ? 'Đang tiến hành quay thưởng'
                    : secondsToClose > 0
                    ? 'Thời gian mua vé còn lại'
                    : 'Chuẩn bị quay'}
                </div>
                <div className="text-sm sm:text-base font-black font-mono">
                  {isDrawing ? (
                    <span className="text-amber-400 animate-pulse">LỒNG QUAY ĐANG CHẠY...</span>
                  ) : secondsToClose > 0 ? (
                    <span className="text-emerald-400">{secondsToClose} giây</span>
                  ) : (
                    <span className="text-rose-400">Đã đóng nhận vé</span>
                  )}
                </div>
              </div>

              <button
                onClick={onNavigateToShop}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <Ticket className="w-4 h-4" />
                <span>Mua vé</span>
              </button>
            </div>
          </div>

          {/* 3D WebGL Lottery Machine Canvas */}
          <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
            <ThreeLotteryMachine
              gameId={selectedGameId}
              isDrawing={isDrawing}
              drawnBalls={drawnBalls}
              specialBall={specialBall}
              currentDrawnNumber={currentDrawnBall}
            />
          </div>

          {/* Digital Result Tray Bar (Synchronized with 3D animation) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Bảng điện tử công bố bóng trúng thưởng:
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {drawnBalls.length} / {game.pickCount} quả đã rút
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 min-h-[50px] p-2 rounded-xl bg-slate-950 border border-slate-800">
              {Array.from({ length: game.pickCount }).map((_, i) => {
                const ball = drawnBalls[i];
                return (
                  <div
                    key={i}
                    className={`w-11 h-11 rounded-full font-bold text-sm font-mono flex items-center justify-center border shadow-md transition-all ${
                      ball !== undefined
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-amber-500/20 scale-105'
                        : 'bg-slate-900 border-dashed border-slate-800 text-slate-600'
                    }`}
                  >
                    {ball !== undefined ? formatNumber(ball) : '?'}
                  </div>
                );
              })}

              {/* Special Ball for 6/55 */}
              {game.hasSpecialBall && (
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold">Đặc biệt:</span>
                  <div
                    className={`w-11 h-11 rounded-full font-bold text-sm font-mono flex items-center justify-center border shadow-md ${
                      specialBall !== undefined
                        ? 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white border-rose-400 shadow-rose-500/30 scale-105'
                        : 'bg-slate-900 border-dashed border-slate-800 text-slate-600'
                    }`}
                  >
                    {specialBall !== undefined ? formatNumber(specialBall) : '+'}
                  </div>
                </div>
              )}
            </div>

            {/* Commit Hash Banner */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 truncate pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-500">Provably Fair Commit:</span>
              <span className="text-amber-400 truncate">{activeRound?.commitHash}</span>
            </div>
          </div>
        </div>

        {/* Right Col: Live Chat & Social Multiplayer */}
        <div className="flex flex-col space-y-3">
          <ChatBox
            messages={chatMessages}
            onSendMessage={onSendMessage}
            userName={userName}
            userAvatar={userAvatar}
          />
        </div>
      </div>
    </div>
  );
};
