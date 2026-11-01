/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LotteryRound, GameId } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import { formatCurrency, formatNumber, verifyProvablyFair } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import {
  History,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';

interface ResultsHistoryViewProps {
  history: LotteryRound[];
}

export const ResultsHistoryView: React.FC<ResultsHistoryViewProps> = ({ history }) => {
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [verifyModalRound, setVerifyModalRound] = useState<LotteryRound | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    tested: boolean;
    valid: boolean;
    computedHash: string;
    computedNumbers: number[];
    computedSpecial?: number;
  } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const filteredHistory = history.filter((r) => {
    if (selectedGame !== 'all' && r.gameId !== selectedGame) return false;
    return true;
  });

  const handleOpenVerifier = (round: LotteryRound) => {
    sound.playClick();
    setVerifyModalRound(round);
    setVerifyResult(null);
  };

  const handleRunVerify = async () => {
    if (!verifyModalRound || !verifyModalRound.revealSeed) return;
    sound.playClick();
    const res = await verifyProvablyFair(
      verifyModalRound.id,
      verifyModalRound.commitHash,
      verifyModalRound.revealSeed,
      verifyModalRound.gameId
    );
    setVerifyResult({
      tested: true,
      valid: res.isValid,
      computedHash: res.computedHash,
      computedNumbers: res.computedNumbers,
      computedSpecial: res.computedSpecial,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            <History className="w-5 h-5" />
            Kết Quả & Lịch Sử Các Kỳ Quay
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Toàn bộ kết quả đều được lưu trữ minh bạch với mã hash SHA-256 Provably Fair để kiểm chứng độc lập.
          </p>
        </div>

        {/* Filter by game */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
          >
            <option value="all">Tất cả trò chơi</option>
            {Object.keys(LOTTERY_GAMES).map((gid) => (
              <option key={gid} value={gid}>
                {LOTTERY_GAMES[gid as GameId].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Round List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
          Chưa có kỳ quay nào hoàn thành trong lịch sử phiên này. Các kỳ quay đang tự động diễn ra theo chu kỳ.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((round) => {
            const game = LOTTERY_GAMES[round.gameId];
            return (
              <div
                key={round.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition-all flex flex-wrap items-center justify-between gap-4"
              >
                {/* Round Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">{game.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                      {round.id}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {round.completedAt ? new Date(round.completedAt).toLocaleString('vi-VN') : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                    Commit: {round.commitHash}
                  </div>
                </div>

                {/* Winning Numbers */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {round.winningNumbers.map((num, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs font-mono flex items-center justify-center border border-amber-300 shadow-md shadow-amber-500/20"
                    >
                      {formatNumber(num)}
                    </div>
                  ))}

                  {/* Special ball if 6/55 */}
                  {round.specialNumber !== undefined && (
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-bold text-xs font-mono flex items-center justify-center border border-rose-400 shadow-md ml-1"
                      title="Bóng đặc biệt"
                    >
                      {formatNumber(round.specialNumber)}
                    </div>
                  )}
                </div>

                {/* Provably Fair Verifier Trigger */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenVerifier(round)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-amber-500/30 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Kiểm chứng</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provably Fair Modal */}
      {verifyModalRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <ShieldCheck className="w-5 h-5" />
                <span>Kiểm Chứng Tính Minh Bạch (Provably Fair)</span>
              </div>
              <button
                onClick={() => setVerifyModalRound(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                Đóng
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>
                Thuật toán Provably Fair cam kết rằng kết quả xổ số đã được tạo ngẫu nhiên bảo mật và mã hóa thành chuỗi{' '}
                <strong className="text-amber-400 font-mono">commitHash</strong> từ <em>trước khi</em> kỳ quay bắt đầu.
                Sau khi kết thúc, máy chủ công khai <strong className="text-amber-400 font-mono">revealSeed</strong> để bất kỳ ai cũng có thể tính toán lại.
              </p>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Kỳ quay (Round ID)</div>
                  <div className="font-mono text-slate-200 text-xs">{verifyModalRound.id}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Mã Commit Hash (Công bố trước khi quay)
                  </div>
                  <div className="font-mono text-amber-400 break-all text-[11px]">
                    {verifyModalRound.commitHash}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    Seed Bí Mật (revealSeed - công bố sau khi quay)
                  </div>
                  <div className="font-mono text-slate-300 break-all text-[11px]">
                    {verifyModalRound.revealSeed || 'Chưa công bố (Kỳ quay đang mở)'}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunVerify}
                disabled={!verifyModalRound.revealSeed}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Chạy kiểm tra toán học SHA-256 ngay</span>
              </button>

              {/* Verification Result Feedback */}
              {verifyResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    verifyResult.valid
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {verifyResult.valid ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <div className="font-bold text-xs">
                      {verifyResult.valid ? 'XÁC THỰC THÀNH CÔNG 100%' : 'XÁC THỰC THẤT BẠI'}
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {verifyResult.valid
                        ? 'Chuỗi SHA-256(revealSeed:roundId) hoàn toàn trùng khớp với Commit Hash ban đầu. Bộ số trúng thưởng trùng khớp 100% với thuật toán sinh ngẫu nhiên.'
                        : 'Mã băm không khớp. Kết quả có thể đã bị can thiệp.'}
                    </p>
                    <div className="text-[10px] font-mono opacity-80 break-all">
                      Computed: {verifyResult.computedHash}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
