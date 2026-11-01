/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserWallet, WalletTransaction } from '../types/lottery';
import { formatCurrency } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import { localDB } from '../services/db';
import confetti from 'canvas-confetti';
import {
  Wallet,
  Gift,
  RotateCw,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Upload,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface WalletViewProps {
  wallet: UserWallet;
  transactions: WalletTransaction[];
  onClaimDaily: () => void;
  onSpinLuckyWheel: (wonAmount: number) => void;
  onRefreshData: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  wallet,
  transactions,
  onClaimDaily,
  onSpinLuckyWheel,
  onRefreshData,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Daily check
  const now = Date.now();
  const canClaimDaily = !wallet.lastDailyClaim || now - wallet.lastDailyClaim > 24 * 60 * 60 * 1000;
  const canSpinLucky = !wallet.lastLuckySpin || now - wallet.lastLuckySpin > 4 * 60 * 60 * 1000;

  const handleClaimDailyClick = () => {
    sound.playClick();
    sound.playWinFanfare();
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    onClaimDaily();
  };

  const handleSpinClick = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    sound.playClick();
    sound.playTumblerBurst();

    // Wheel rewards
    const rewards = [20000, 50000, 30000, 100000, 40000, 200000, 10000, 80000];
    const pickedReward = rewards[Math.floor(Math.random() * rewards.length)];

    setTimeout(() => {
      setIsSpinning(false);
      setSpinResult(pickedReward);
      sound.playWinFanfare();
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      onSpinLuckyWheel(pickedReward);
    }, 2000);
  };

  // Export full backup
  const handleExportBackup = async () => {
    sound.playClick();
    const jsonStr = await localDB.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `norat_lottery_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const success = await localDB.importFullBackup(content);
      if (success) {
        sound.playWinFanfare();
        setImportStatus('Khôi phục dữ liệu thành công!');
        onRefreshData();
      } else {
        setImportStatus('Tệp sao lưu không hợp lệ!');
      }
      setTimeout(() => setImportStatus(null), 3500);
    };
    reader.readAsText(file);
  };

  const netProfit = wallet.totalWon - wallet.totalSpent;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Wallet Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-500/30 p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Số dư khả dụng (Tiền ảo)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
            {formatCurrency(wallet.balance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Tiền ảo giải trí mô phỏng, không có giá trị quy đổi tiền thật.
          </p>
        </div>

        {/* Total Won Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tổng tiền thưởng đã trúng
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(wallet.totalWon)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Đã trúng {wallet.winCount} giải thưởng từ các kỳ quay
          </p>
        </div>

        {/* Total Spent Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Lợi nhuận ròng
            </span>
            <div
              className={`p-2 rounded-xl ${
                netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netProfit >= 0 ? `+${formatCurrency(netProfit)}` : formatCurrency(netProfit)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Tổng mua: {formatCurrency(wallet.totalSpent)} ({wallet.ticketCount} vé)
          </p>
        </div>
      </div>

      {/* Rewards & Daily Claims Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Bonus Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-200">Điểm danh nhận xu hàng ngày</h3>
            </div>
            <p className="text-xs text-slate-400">
              Nhận ngay <strong className="text-amber-400">50.000 xu</strong> mỗi 24 giờ để tiếp tục giải trí!
            </p>
          </div>

          <button
            onClick={handleClaimDailyClick}
            disabled={!canClaimDaily}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              canClaimDaily
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {canClaimDaily ? 'Nhận 50.000 xu' : 'Đã nhận hôm nay'}
          </button>
        </div>

        {/* Lucky Spin Wheel Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm text-slate-200">Vòng quay may mắn nhận xu</h3>
            </div>
            <p className="text-xs text-slate-400">
              Cơ hội nhận ngẫu nhiên từ <strong className="text-purple-300">10.000 xu</strong> đến{' '}
              <strong className="text-purple-300">200.000 xu</strong> mỗi 4 giờ!
            </p>
          </div>

          <button
            onClick={handleSpinClick}
            disabled={!canSpinLucky || isSpinning}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              canSpinLucky && !isSpinning
                ? 'bg-gradient-to-r from-purple-600 to-indigo-500 hover:brightness-110 text-white shadow-md shadow-purple-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Đang quay...' : canSpinLucky ? 'Quay miễn phí' : 'Chờ hồi chiêu'}</span>
          </button>
        </div>
      </div>

      {/* Backup Export/Import & Ledger */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Lịch Sử Giao Dịch Bất Biến (Ledger)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mọi biến động số dư đều được định danh bằng mã giao dịch duy nhất
            </p>
          </div>

          {/* Backup Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              title="Xuất file JSON sao lưu vé và số dư"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Xuất sao lưu</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Nhập sao lưu</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>
          </div>
        </div>

        {importStatus && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {importStatus}
          </div>
        )}

        {/* Transaction Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/80 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Mã GD</th>
                <th className="py-2.5 px-3">Loại GD</th>
                <th className="py-2.5 px-3">Mô tả</th>
                <th className="py-2.5 px-3">Số tiền</th>
                <th className="py-2.5 px-3">Số dư sau</th>
                <th className="py-2.5 px-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 30).map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400">{tx.id.slice(0, 14)}...</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                            tx.type === 'prize_payout'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : tx.type === 'ticket_purchase'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {tx.type === 'prize_payout'
                            ? 'Trúng thưởng'
                            : tx.type === 'ticket_purchase'
                            ? 'Mua vé số'
                            : tx.type === 'ticket_refund'
                            ? 'Hoàn tiền vé'
                            : tx.type === 'daily_reward'
                            ? 'Điểm danh'
                            : tx.type === 'lucky_spin'
                            ? 'Vòng quay'
                            : tx.type === 'mission_reward'
                            ? 'Nhiệm vụ'
                            : 'Khởi tạo'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{tx.description}</td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{formatCurrency(tx.balanceAfter)}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(tx.timestamp).toLocaleTimeString('vi-VN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
