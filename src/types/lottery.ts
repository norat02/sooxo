/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameId = 'mega645' | 'power655' | 'max535' | 'digits3d' | 'digits2d';

export interface GameConfig {
  id: GameId;
  name: string;
  subtitle: string;
  description: string;
  totalBalls: number; // e.g. 45 for 6/45
  pickCount: number;  // e.g. 6
  hasSpecialBall: boolean;
  ticketPrice: number; // virtual currency
  minNumber: number;  // e.g. 1
  maxNumber: number;  // e.g. 45
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    badgeBg: string;
  };
  prizeTiers: PrizeTierConfig[];
}

export interface PrizeTierConfig {
  tierId: string;
  name: string;
  conditionDescription: string;
  matchesRequired: number;
  specialMatchRequired?: boolean;
  basePrize: number; // fixed or jackpot share
  isJackpot?: boolean;
}

export interface LotteryRound {
  id: string; // e.g. "R-645-1001"
  gameId: GameId;
  roundNumber: number;
  status: 'betting' | 'closed' | 'drawing' | 'completed';
  createdAt: number;
  closeTime: number; // tickets cannot be bought after this
  drawTime: number;  // drawing starts
  completedAt?: number;
  commitHash: string; // SHA-256(revealSeed + ":" + id)
  revealSeed?: string; // Revealed after draw completes
  winningNumbers: number[];
  specialNumber?: number;
  drawnSequence: { number: number; isSpecial?: boolean; timestamp: number }[];
  currentDrawnIndex: number; // during live draw
  jackpotPool: number;
  totalTicketsSold: number;
  totalPrizesPaid: number;
}

export interface TicketBoard {
  id: string; // "A", "B", "C", etc.
  numbers: number[];
  specialNumber?: number;
}

export interface TicketMatchDetail {
  boardId: string;
  matchedNumbers: number[];
  matchedSpecial?: boolean;
  tierId?: string;
  tierName?: string;
  prizeAmount: number;
}

export interface LotteryTicket {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  gameId: GameId;
  roundId: string;
  roundNumber: number;
  boards: TicketBoard[];
  totalCost: number;
  purchasedAt: number;
  status: 'pending' | 'drawing' | 'won' | 'lost' | 'cancelled';
  totalWon: number;
  matches: TicketMatchDetail[];
  cancelledAt?: number;
}

export interface UserWallet {
  balance: number;
  totalSpent: number;
  totalWon: number;
  ticketCount: number;
  winCount: number;
  lastDailyClaim?: number;
  lastLuckySpin?: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'initial_grant' | 'ticket_purchase' | 'prize_payout' | 'ticket_refund' | 'daily_reward' | 'lucky_spin' | 'mission_reward';
  amount: number; // positive or negative
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string; // ticketId, roundId, missionId
  description: string;
  timestamp: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  isHost?: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'jackpot';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  targetCount: number;
  progressType: 'buy_ticket' | 'join_rounds' | 'win_prize' | 'play_all_games';
  icon: string;
}

export interface UserAchievementProgress {
  claimedMissions: string[];
  roundsJoined: string[]; // round ids
  gamesPlayed: GameId[];
  totalWins: number;
  totalTicketsBought: number;
}

export interface NumberStatistic {
  number: number;
  count: number;
  lastSeenRound?: number;
  frequencyPercentage: number;
}

export interface ProvablyFairVerification {
  roundId: string;
  commitHash: string;
  revealSeed: string;
  isValid: boolean;
  computedHash: string;
  computedNumbers: number[];
  computedSpecial?: number;
}
