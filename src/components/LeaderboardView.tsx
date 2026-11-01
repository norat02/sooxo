/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatCurrency } from '../utils/lotteryEngine';
import { Trophy, Medal, Crown, Users } from 'lucide-react';

interface LeaderboardViewProps {
  onlineUsers: { id: string; name: string; avatar: string }[];
  currentUserName: string;
  currentUserBalance: number;
  currentUserWon: number;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  onlineUsers,
  currentUserName,
  currentUserBalance,
  currentUserWon,
}) => {
  // Mock simulation of high rollers for realistic social lottery leaderboard
  const mockLeaders = [
    { rank: 1, name: 'Nguyễn Thần Tài', avatar: '🤴', won: 18500000000, jackpot: 'Jackpot 1 Power 6/55', online: true },
    { rank: 2, name: 'Trần Đại Phú', avatar: '🦁', won: 12000000000, jackpot: 'Jackpot Mega 6/45', online: true },
    { rank: 3, name: 'Lê Hoàng Kim', avatar: '💎', won: 3500000000, jackpot: 'Jackpot 2 Power 6/55', online: false },
    { rank: 4, name: 'Vũ Minh Đức', avatar: '🚀', won: 2000000000, jackpot: 'Giải Đặc Biệt Max 5/35', online: true },
    { rank: 5, name: 'Phạm Thị May Mắn', avatar: '🍀', won: 850000000, jackpot: 'Giải Nhất Power 6/55', online: false },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Bảng Vinh Danh Tỷ Phú Xổ Số
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Xếp hạng những người chơi may mắn ẵm trọn các giải thưởng Jackpot kỷ lục
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
          <Users className="w-4 h-4" />
          <span>{onlineUsers.length} người đang trực tuyến</span>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockLeaders.slice(0, 3).map((leader) => (
          <div
            key={leader.rank}
            className={`p-5 rounded-2xl border relative overflow-hidden flex flex-col items-center text-center ${
              leader.rank === 1
                ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-400 shadow-xl shadow-amber-500/10 md:-translate-y-2'
                : leader.rank === 2
                ? 'bg-slate-900/90 border-slate-700'
                : 'bg-slate-900/90 border-amber-900/50'
            }`}
          >
            {/* Crown/Medal */}
            <div className="mb-2">
              {leader.rank === 1 ? (
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-400">
                  <Crown className="w-7 h-7 text-amber-400" />
                </div>
              ) : leader.rank === 2 ? (
                <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-600">
                  <Medal className="w-6 h-6 text-slate-300" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-800">
                  <Medal className="w-6 h-6 text-amber-600" />
                </div>
              )}
            </div>

            <div className="text-2xl mb-1">{leader.avatar}</div>
            <h4 className="font-bold text-sm text-slate-200">{leader.name}</h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-amber-400 font-mono mt-1">
              {leader.jackpot}
            </span>

            <div className="text-base font-black text-amber-400 font-mono mt-3">
              {formatCurrency(leader.won)}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
        <h3 className="font-bold text-sm text-slate-200">Bảng Tổng Sắp Thành Tích</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Hạng</th>
                <th className="py-2.5 px-3">Người chơi</th>
                <th className="py-2.5 px-3">Giải thưởng cao nhất</th>
                <th className="py-2.5 px-3">Tổng trúng thưởng</th>
                <th className="py-2.5 px-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {mockLeaders.map((item) => (
                <tr key={item.rank} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-slate-400">#{item.rank}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-200 flex items-center gap-2">
                    <span className="text-base">{item.avatar}</span>
                    <span>{item.name}</span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-amber-400">{item.jackpot}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">{formatCurrency(item.won)}</td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5 font-sans text-[11px] text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Trực tuyến
                    </span>
                  </td>
                </tr>
              ))}

              {/* Current User Row */}
              <tr className="bg-amber-500/10 border-t-2 border-amber-400/40">
                <td className="py-2.5 px-3 font-bold text-amber-400">Bạn</td>
                <td className="py-2.5 px-3 font-sans font-bold text-amber-300 flex items-center gap-2">
                  <span className="text-base">🧑</span>
                  <span>{currentUserName}</span>
                </td>
                <td className="py-2.5 px-3 font-sans text-slate-300">Tham gia tích cực</td>
                <td className="py-2.5 px-3 font-bold text-amber-400">{formatCurrency(currentUserWon)}</td>
                <td className="py-2.5 px-3 font-sans text-[11px] text-emerald-400 font-bold">
                  Hiện tại
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
