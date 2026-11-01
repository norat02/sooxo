/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MISSIONS } from '../constants/games';
import { UserAchievementProgress, Mission } from '../types/lottery';
import { formatCurrency } from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
  Flame,
  Ticket,
  Layers,
} from 'lucide-react';

interface MissionsViewProps {
  progress: UserAchievementProgress;
  onClaimMission: (mission: Mission) => void;
}

export const MissionsView: React.FC<MissionsViewProps> = ({ progress, onClaimMission }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Ticket':
        return <Ticket className="w-5 h-5 text-amber-400" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-rose-400" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-purple-400" />;
      default:
        return <Award className="w-5 h-5 text-amber-400" />;
    }
  };

  const calculateProgress = (m: Mission): { current: number; completed: boolean; claimed: boolean } => {
    const claimed = progress.claimedMissions.includes(m.id);
    let current = 0;

    switch (m.progressType) {
      case 'buy_ticket':
        current = progress.totalTicketsBought;
        break;
      case 'join_rounds':
        current = progress.roundsJoined.length;
        break;
      case 'win_prize':
        current = progress.totalWins;
        break;
      case 'play_all_games':
        current = progress.gamesPlayed.length;
        break;
    }

    const completed = current >= m.targetCount;
    return { current: Math.min(current, m.targetCount), completed, claimed };
  };

  const handleClaim = (m: Mission) => {
    sound.playClick();
    sound.playWinFanfare();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    onClaimMission(m);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Nhiệm Vụ & Thành Tựu
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hoàn thành các cột mốc thử thách để nhận thêm xu ảo giải trí và danh hiệu danh giá
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
          Đã nhận {progress.claimedMissions.length}/{MISSIONS.length} thành tựu
        </div>
      </div>

      {/* Mission List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MISSIONS.map((m) => {
          const { current, completed, claimed } = calculateProgress(m);
          const percent = Math.floor((current / m.targetCount) * 100);

          return (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                claimed
                  ? 'bg-slate-950/60 border-slate-800/80 opacity-70'
                  : completed
                  ? 'bg-slate-900/90 border-amber-400/80 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      {getIcon(m.icon)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{m.title}</h4>
                      <p className="text-xs text-slate-400">{m.description}</p>
                    </div>
                  </div>

                  <div className="text-xs font-black text-amber-400 font-mono shrink-0">
                    +{formatCurrency(m.rewardCoins)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Tiến độ:</span>
                    <span>
                      {current} / {m.targetCount} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        completed ? 'bg-amber-400' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
                {claimed ? (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ĐÃ NHẬN THƯỞNG
                  </span>
                ) : completed ? (
                  <button
                    onClick={() => handleClaim(m)}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Nhận {formatCurrency(m.rewardCoins)}
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">Chưa hoàn thành</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
