/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LotteryTicket, GameId } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import { formatCurrency, formatNumber } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import {
  Ticket,
  Clock,
  Sparkles,
  XCircle,
  AlertCircle,
  Ban,
  Search,
  CheckCircle,
} from 'lucide-react';

interface MyTicketsViewProps {
  tickets: LotteryTicket[];
  onCancelTicket: (ticketId: string) => void;
  onNavigateToShop: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  tickets,
  onCancelTicket,
  onNavigateToShop,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [selectedDetailTicket, setSelectedDetailTicket] = useState<LotteryTicket | null>(null);

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterGame !== 'all' && t.gameId !== filterGame) return false;
    return true;
  });

  const getStatusBadge = (status: LotteryTicket['status']) => {
    switch (status) {
      case 'won':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            TRÚNG THƯỞNG
          </span>
        );
      case 'lost':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium">
            KHÔNG TRÚNG
          </span>
        );
      case 'drawing':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            ĐANG QUAY
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-medium flex items-center gap-1">
            <Ban className="w-3 h-3" />
            ĐÃ HỦY
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            CHỜ QUAY
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Filters Bar */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Vé Của Tôi ({tickets.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý toàn bộ vé đã mua, kiểm tra đối chiếu kết quả và trạng thái nhận thưởng
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Game filter */}
          <select
            value={filterGame}
            onChange={(e) => setFilterGame(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-amber-400"
          >
            <option value="all">Tất cả trò chơi</option>
            {Object.keys(LOTTERY_GAMES).map((gid) => (
              <option key={gid} value={gid}>
                {LOTTERY_GAMES[gid as GameId].name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['all', 'pending', 'won', 'lost', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  sound.playClick();
                  setFilterStatus(st);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all'
                  ? 'Tất cả'
                  : st === 'pending'
                  ? 'Chờ quay'
                  : st === 'won'
                  ? 'Trúng thưởng'
                  : st === 'lost'
                  ? 'Không trúng'
                  : 'Đã hủy'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket List Cards */}
      {filteredTickets.length === 0 ? (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Chưa có vé nào trong danh sách</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy chọn các con số may mắn của bạn và tham gia kỳ quay tiếp theo để có cơ hội trúng giải thưởng lớn!
          </p>
          <button
            onClick={onNavigateToShop}
            className="mt-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95"
          >
            Đến khu vực mua vé ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => {
            const game = LOTTERY_GAMES[ticket.gameId];
            return (
              <div
                key={ticket.id}
                className={`bg-slate-900/90 rounded-2xl border transition-all p-4 relative overflow-hidden flex flex-col justify-between ${
                  ticket.status === 'won'
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Top Details */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-200">{game.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">#{ticket.roundId}</span>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between mb-3 font-mono">
                    <span>Mã vé: {ticket.id}</span>
                    <span>{new Date(ticket.purchasedAt).toLocaleTimeString('vi-VN')}</span>
                  </div>

                  {/* Boards display */}
                  <div className="space-y-2">
                    {ticket.boards.map((b) => {
                      const match = ticket.matches?.find((m) => m.boardId === b.id);
                      return (
                        <div
                          key={b.id}
                          className={`p-2 rounded-xl bg-slate-950/80 border flex items-center justify-between gap-2 ${
                            match && match.prizeAmount > 0
                              ? 'border-emerald-500/40 bg-emerald-950/20'
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                              {b.id}
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              {b.numbers.map((n) => {
                                const isMatched = match?.matchedNumbers?.includes(n);
                                return (
                                  <span
                                    key={n}
                                    className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center border ${
                                      isMatched
                                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm scale-110'
                                        : 'bg-slate-900 text-slate-300 border-slate-700'
                                    }`}
                                  >
                                    {formatNumber(n)}
                                  </span>
                                );
                              })}

                              {b.specialNumber !== undefined && (
                                <span
                                  className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center border ml-1 ${
                                    match?.matchedSpecial
                                      ? 'bg-rose-500 text-white border-rose-400 scale-110 shadow-sm'
                                      : 'bg-slate-900 text-rose-400 border-rose-900/60'
                                  }`}
                                  title="Bóng đặc biệt"
                                >
                                  {formatNumber(b.specialNumber)}
                                </span>
                              )}
                            </div>
                          </div>

                          {match && match.prizeAmount > 0 && (
                            <span className="text-xs font-black text-amber-400 font-mono">
                              +{formatCurrency(match.prizeAmount)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Bottom / Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Giá vé: </span>
                    <span className="font-bold text-slate-200 font-mono">
                      {formatCurrency(ticket.totalCost)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Allow cancel if pending */}
                    {ticket.status === 'pending' && (
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn hủy vé ${ticket.id} và nhận lại toàn bộ ${formatCurrency(ticket.totalCost)} không?`)) {
                            sound.playClick();
                            onCancelTicket(ticket.id);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition-colors"
                      >
                        Hủy vé (Hoàn tiền)
                      </button>
                    )}

                    {ticket.status === 'won' && (
                      <span className="text-sm font-black text-emerald-400 font-mono">
                        Tổng trúng: {formatCurrency(ticket.totalWon)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
