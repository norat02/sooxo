/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LotteryRound, GameId } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import { formatNumber } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import {
  BarChart2,
  Flame,
  Snowflake,
  AlertTriangle,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';

interface StatsViewProps {
  history: LotteryRound[];
}

export const StatsView: React.FC<StatsViewProps> = ({ history }) => {
  const [selectedGame, setSelectedGame] = useState<GameId>('mega645');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d'>('30d');

  const game = LOTTERY_GAMES[selectedGame];

  // Filter rounds by game
  const gameRounds = history.filter((r) => r.gameId === selectedGame);

  // Compute number frequencies
  const frequencies: Record<number, number> = {};
  for (let i = game.minNumber; i <= game.maxNumber; i++) {
    frequencies[i] = 0;
  }

  // Count appearance
  gameRounds.forEach((r) => {
    r.winningNumbers.forEach((n) => {
      frequencies[n] = (frequencies[n] || 0) + 1;
    });
  });

  const sortedNumbers = Object.entries(frequencies)
    .map(([numStr, count]) => ({ number: Number(numStr), count }))
    .sort((a, b) => b.count - a.count);

  const hotNumbers = sortedNumbers.slice(0, 5);
  const coldNumbers = [...sortedNumbers].reverse().slice(0, 5);

  const maxFreq = Math.max(...Object.values(frequencies), 1);

  // Compute frequent pairs
  const pairFreq: Record<string, number> = {};
  gameRounds.forEach((r) => {
    const nums = [...r.winningNumbers].sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        pairFreq[key] = (pairFreq[key] || 0) + 1;
      }
    }
  });

  const sortedPairs = Object.entries(pairFreq)
    .map(([key, count]) => {
      const [n1, n2] = key.split('-').map(Number);
      return { n1, n2, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Thống Kê Chuyên Sâu Tần Suất Xổ Số
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dữ liệu tổng hợp từ các kỳ quay thực tế đã hoàn thành
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value as GameId)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-amber-400"
          >
            {Object.keys(LOTTERY_GAMES).map((gid) => (
              <option key={gid} value={gid}>
                {LOTTERY_GAMES[gid as GameId].name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['7d', '30d', '90d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  sound.playClick();
                  setTimeFilter(t);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  timeFilter === t
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === '7d' ? '7 Ngày' : t === '30d' ? '30 Ngày' : '90 Ngày'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mandatory Statistical Disclaimer (Prompt requirement 10) */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">LƯU Ý QUAN TRỌNG VỀ TÍNH NGẪU NHIÊN:</strong>
          <p className="text-[11px] leading-relaxed opacity-90">
            Thống kê lịch sử mang tính chất tham khảo mô phỏng và phân tích xác suất thuần túy. Theo nguyên lý biến cố ngẫu nhiên độc lập trong toán học, mỗi kỳ quay số là hoàn toàn độc lập và bảng thống kê không thể dự đoán hoặc đảm bảo kết quả của bất kỳ kỳ quay nào trong tương lai.
          </p>
        </div>
      </div>

      {/* Hot & Cold Numbers Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hot Numbers */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <Flame className="w-4 h-4" />
              <span>Top 5 Số Về Nhiều Nhất (Hot Numbers)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Tổng {gameRounds.length} kỳ
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {hotNumbers.map((item, idx) => (
              <div
                key={item.number}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1"
              >
                <div className="text-[10px] text-slate-500 uppercase">Hạng #{idx + 1}</div>
                <div className="w-9 h-9 mx-auto rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white font-bold text-sm font-mono flex items-center justify-center border border-amber-400 shadow-md">
                  {formatNumber(item.number)}
                </div>
                <div className="text-xs font-mono font-bold text-amber-400">{item.count} lần</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cold Numbers */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Snowflake className="w-4 h-4" />
              <span>Top 5 Số Về Ít Nhất / Gan Lì (Cold Numbers)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Tổng {gameRounds.length} kỳ
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {coldNumbers.map((item, idx) => (
              <div
                key={item.number}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1"
              >
                <div className="text-[10px] text-slate-500 uppercase">Hạng #{idx + 1}</div>
                <div className="w-9 h-9 mx-auto rounded-full bg-slate-800 text-blue-300 font-bold text-sm font-mono flex items-center justify-center border border-blue-500/40 shadow-sm">
                  {formatNumber(item.number)}
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">{item.count} lần</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Common Number Pairs */}
      {sortedPairs.length > 0 && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Các cặp số thường hay xuất hiện cùng nhau:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {sortedPairs.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold text-xs font-mono flex items-center justify-center">
                    {formatNumber(p.n1)}
                  </span>
                  <span className="text-slate-500 font-bold">-</span>
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold text-xs font-mono flex items-center justify-center">
                    {formatNumber(p.n2)}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400">{p.count} kỳ xuất hiện</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Number Frequency Distribution Bar Chart */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
        <div className="text-sm font-bold text-slate-200 flex items-center justify-between">
          <span>Biểu đồ tần suất chi tiết từng số ({game.name})</span>
          <span className="text-xs text-slate-500 font-normal">Từ số {game.minNumber} đến {game.maxNumber}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {Array.from({ length: game.totalBalls }).map((_, i) => {
            const num = i + 1;
            const count = frequencies[num] || 0;
            const percentage = maxFreq > 0 ? (count / maxFreq) * 100 : 0;
            return (
              <div
                key={num}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                  {formatNumber(num)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">{count} lần</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
