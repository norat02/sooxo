/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameId, LotteryRound } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import { formatCurrency } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Sliders,
  Users,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface AdminViewProps {
  rounds: Record<GameId, LotteryRound>;
  onTriggerDraw: (gameId: GameId, pin: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const AdminView: React.FC<AdminViewProps> = ({ rounds, onTriggerDraw }) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; msg: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (pin === '8888') {
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError('Mã PIN quản trị không chính xác! (Mặc định: 8888)');
    }
  };

  const handleTrigger = async (gameId: GameId) => {
    setIsLoading(true);
    sound.playClick();
    try {
      const res = await onTriggerDraw(gameId, pin);
      if (res.success) {
        sound.playWinFanfare();
        setActionFeedback({ success: true, msg: res.message || `Đã kích hoạt quay số ${gameId}` });
      } else {
        setActionFeedback({ success: false, msg: res.error || 'Thao tác thất bại' });
      }
    } catch {
      setActionFeedback({ success: false, msg: 'Lỗi kết nối máy chủ' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h3 className="font-bold text-base text-slate-200">Xác Thực Quản Trị Host</h3>
            <p className="text-xs text-slate-400 mt-1">
              Nhập mã PIN bảo mật máy chủ để truy cập bảng điều khiển vận hành xổ số (Mã mặc định:{' '}
              <strong className="text-amber-400">8888</strong>)
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Nhập mã PIN quản trị..."
              maxLength={8}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-slate-200 focus:outline-none focus:border-amber-400"
            />

            {authError && <div className="text-xs text-rose-400">{authError}</div>}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              Mở khóa quyền Host
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-rose-500/30 p-5 shadow-xl flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-black text-rose-400">Bảng Điều Khiển Quản Trị Host</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
              AUTH LEVEL: HOST
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản trị chu kỳ quay số, kiểm tra vé thời gian thực và quản lý phòng quay
          </p>
        </div>

        <button
          onClick={() => setIsAuthenticated(false)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold"
        >
          Khóa bảng điều khiển
        </button>
      </div>

      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            actionFeedback.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {actionFeedback.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionFeedback.msg}</span>
        </div>
      )}

      {/* 5 Games Live Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.keys(LOTTERY_GAMES) as GameId[]).map((gid) => {
          const game = LOTTERY_GAMES[gid];
          const round = rounds[gid];
          const isDrawing = round?.status === 'drawing';

          return (
            <div
              key={gid}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-sm text-slate-200">{game.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      isDrawing
                        ? 'bg-amber-500/20 text-amber-300'
                        : round?.status === 'betting'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {round?.status ? round.status.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Kỳ quay:</span>
                    <span className="text-slate-200">{round?.id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Vé đã bán:</span>
                    <span className="text-slate-200">{round?.totalTicketsSold || 0} bảng</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Quỹ Jackpot:</span>
                    <span className="text-amber-400 font-bold">
                      {formatCurrency(round?.jackpotPool || 0)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-1">
                    Commit: {round?.commitHash}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleTrigger(gid)}
                  disabled={isLoading || isDrawing}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isDrawing
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 active:scale-95'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isDrawing ? 'Đang quay số...' : 'KÍCH HOẠT QUAY NGAY LẬP TỨC'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Rule Notice */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
        <strong className="text-slate-300 font-bold">Quy tắc bảo mật hệ thống:</strong>
        <p>
          Máy chủ bảo đảm tính bất biến (Immutability): Sau khi một kỳ quay đã công bố kết quả và lộ seed,
          kể cả Host cũng không thể sửa đổi số trúng thưởng hoặc kết quả trả thưởng đã chốt.
        </p>
      </div>
    </div>
  );
};
