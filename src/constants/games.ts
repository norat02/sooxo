/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameConfig, GameId, Mission } from '../types/lottery';

export const LOTTERY_GAMES: Record<GameId, GameConfig> = {
  mega645: {
    id: 'mega645',
    name: 'Mega 6/45',
    subtitle: 'Xổ số ma trận kinh điển',
    description: 'Chọn 6 số trong tập hợp từ 01 đến 45. Trúng cả 6 số để ẵm trọn Jackpot tích lũy siêu khủng!',
    totalBalls: 45,
    pickCount: 6,
    hasSpecialBall: false,
    ticketPrice: 10000,
    minNumber: 1,
    maxNumber: 45,
    colorScheme: {
      primary: '#ef4444',
      secondary: '#dc2626',
      accent: '#fca5a5',
      badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    prizeTiers: [
      {
        tierId: 'jackpot',
        name: 'Jackpot',
        conditionDescription: 'Trùng khớp 6 số',
        matchesRequired: 6,
        basePrize: 12000000000,
        isJackpot: true,
      },
      {
        tierId: 'tier1',
        name: 'Giải Nhất',
        conditionDescription: 'Trùng khớp 5 số',
        matchesRequired: 5,
        basePrize: 10000000,
      },
      {
        tierId: 'tier2',
        name: 'Giải Nhì',
        conditionDescription: 'Trùng khớp 4 số',
        matchesRequired: 4,
        basePrize: 300000,
      },
      {
        tierId: 'tier3',
        name: 'Giải Ba',
        conditionDescription: 'Trùng khớp 3 số',
        matchesRequired: 3,
        basePrize: 30000,
      },
    ],
  },

  power655: {
    id: 'power655',
    name: 'Power 6/55',
    subtitle: 'Đỉnh cao Jackpot kép',
    description: 'Chọn 6 số từ 01 đến 55. Cơ hội rinh Jackpot 1 tối thiểu 30 tỷ và Jackpot 2 với bóng đặc biệt!',
    totalBalls: 55,
    pickCount: 6,
    hasSpecialBall: true,
    ticketPrice: 10000,
    minNumber: 1,
    maxNumber: 55,
    colorScheme: {
      primary: '#eab308',
      secondary: '#ca8a04',
      accent: '#fef08a',
      badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    },
    prizeTiers: [
      {
        tierId: 'jackpot1',
        name: 'Jackpot 1',
        conditionDescription: 'Trùng khớp 6 số chính',
        matchesRequired: 6,
        basePrize: 30000000000,
        isJackpot: true,
      },
      {
        tierId: 'jackpot2',
        name: 'Jackpot 2',
        conditionDescription: 'Trùng 5 số chính + Số đặc biệt',
        matchesRequired: 5,
        specialMatchRequired: true,
        basePrize: 3000000000,
        isJackpot: true,
      },
      {
        tierId: 'tier1',
        name: 'Giải Nhất',
        conditionDescription: 'Trùng khớp 5 số',
        matchesRequired: 5,
        basePrize: 40000000,
      },
      {
        tierId: 'tier2',
        name: 'Giải Nhì',
        conditionDescription: 'Trùng khớp 4 số',
        matchesRequired: 4,
        basePrize: 500000,
      },
      {
        tierId: 'tier3',
        name: 'Giải Ba',
        conditionDescription: 'Trùng khớp 3 số',
        matchesRequired: 3,
        basePrize: 50000,
      },
    ],
  },

  max535: {
    id: 'max535',
    name: 'Max 5/35',
    subtitle: 'Dễ chơi, tỷ lệ trúng cực cao',
    description: 'Chọn 5 số từ 01 đến 35. Phạm vi số gọn gàng giúp nâng cao xác suất trúng thưởng!',
    totalBalls: 35,
    pickCount: 5,
    hasSpecialBall: false,
    ticketPrice: 10000,
    minNumber: 1,
    maxNumber: 35,
    colorScheme: {
      primary: '#3b82f6',
      secondary: '#2563eb',
      accent: '#bfdbfe',
      badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    prizeTiers: [
      {
        tierId: 'jackpot',
        name: 'Giải Đặc Biệt',
        conditionDescription: 'Trùng khớp 5 số',
        matchesRequired: 5,
        basePrize: 2000000000,
        isJackpot: true,
      },
      {
        tierId: 'tier1',
        name: 'Giải Nhất',
        conditionDescription: 'Trùng khớp 4 số',
        matchesRequired: 4,
        basePrize: 5000000,
      },
      {
        tierId: 'tier2',
        name: 'Giải Nhì',
        conditionDescription: 'Trùng khớp 3 số',
        matchesRequired: 3,
        basePrize: 100000,
      },
      {
        tierId: 'tier3',
        name: 'Giải Ba',
        conditionDescription: 'Trùng khớp 2 số',
        matchesRequired: 2,
        basePrize: 20000,
      },
    ],
  },

  digits3d: {
    id: 'digits3d',
    name: 'Xổ số 3D (000–999)',
    subtitle: 'Dự đoán 3 chữ số kỳ diệu',
    description: 'Chọn 3 chữ số từ 000 đến 999. Hỗ trợ chữ số 0 ở đầu (ví dụ: 042, 007). Trúng giải gấp 1.000 lần!',
    totalBalls: 10, // 3 rolls of digits 0-9
    pickCount: 3,
    hasSpecialBall: false,
    ticketPrice: 10000,
    minNumber: 0,
    maxNumber: 999,
    colorScheme: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#a7f3d0',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    prizeTiers: [
      {
        tierId: 'exact',
        name: 'Trùng chính xác (Đặc biệt)',
        conditionDescription: 'Trùng đúng thứ tự 3 chữ số',
        matchesRequired: 3,
        basePrize: 10000000, // x1000
      },
      {
        tierId: 'box',
        name: 'Trùng tổ hợp (Box)',
        conditionDescription: 'Trùng đủ 3 chữ số khác thứ tự',
        matchesRequired: 3,
        basePrize: 1500000, // x150
      },
    ],
  },

  digits2d: {
    id: 'digits2d',
    name: 'Xổ số 2D (00–99)',
    subtitle: 'Nhanh chóng & lôi cuốn',
    description: 'Chọn 2 chữ số may mắn từ 00 đến 99. Tỷ lệ thưởng x70 lần giá trị vé cược!',
    totalBalls: 10, // 2 rolls of digits 0-9
    pickCount: 2,
    hasSpecialBall: false,
    ticketPrice: 10000,
    minNumber: 0,
    maxNumber: 99,
    colorScheme: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#ddd6fe',
      badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    prizeTiers: [
      {
        tierId: 'exact',
        name: 'Trùng chính xác 2D',
        conditionDescription: 'Trùng chính xác cặp số 00-99',
        matchesRequired: 2,
        basePrize: 700000, // x70
      },
    ],
  },
};

export const MISSIONS: Mission[] = [
  {
    id: 'm1_first_ticket',
    title: 'Tân Thủ May Mắn',
    description: 'Mua chiếc vé số 3D đầu tiên của bạn',
    rewardCoins: 50000,
    targetCount: 1,
    progressType: 'buy_ticket',
    icon: 'Ticket',
  },
  {
    id: 'm2_five_rounds',
    title: 'Người Chơi Chăm Chỉ',
    description: 'Tham gia dự thưởng ít nhất 5 kỳ quay',
    rewardCoins: 100000,
    targetCount: 5,
    progressType: 'join_rounds',
    icon: 'Clock',
  },
  {
    id: 'm3_ten_rounds',
    title: 'Bậc Thầy Dự Thưởng',
    description: 'Tham gia dự thưởng 10 kỳ quay số',
    rewardCoins: 250000,
    targetCount: 10,
    progressType: 'join_rounds',
    icon: 'Trophy',
  },
  {
    id: 'm4_first_win',
    title: 'Phát Tài Phát Lộc',
    description: 'Trúng thưởng bất kỳ giải nào lần đầu tiên',
    rewardCoins: 150000,
    targetCount: 1,
    progressType: 'win_prize',
    icon: 'Sparkles',
  },
  {
    id: 'm5_three_wins',
    title: 'Thần Tài Gõ Cửa',
    description: 'Đạt thành tích trúng thưởng 3 lần',
    rewardCoins: 500000,
    targetCount: 3,
    progressType: 'win_prize',
    icon: 'Flame',
  },
  {
    id: 'm6_all_games',
    title: 'Bộ Sưu Tập Đỉnh Cao',
    description: 'Trải nghiệm vé số ở cả 5 loại hình xổ số',
    rewardCoins: 300000,
    targetCount: 5,
    progressType: 'play_all_games',
    icon: 'Layers',
  },
];
