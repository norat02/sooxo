/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameId, TicketBoard, TicketMatchDetail, ProvablyFairVerification } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';

/**
 * Standard SHA-256 hash implementation using Web Crypto or Node Crypto
 */
export async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Node.js fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(message).digest('hex');
  } catch {
    // Pure JS fallback if crypto unavailable
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Generates a commit hash for Provably Fair rounds
 */
export async function generateCommitHash(seed: string, roundId: string): Promise<string> {
  return await sha256(`${seed}:${roundId}`);
}

/**
 * Deterministically generates winning numbers based on seed string.
 * This guarantees fairness and reproducible verification.
 */
export function generateDeterministicNumbers(
  gameId: GameId,
  seed: string
): { winningNumbers: number[]; specialNumber?: number } {
  const game = LOTTERY_GAMES[gameId];
  if (!game) throw new Error(`Unknown game: ${gameId}`);

  // Create pseudo-random seed generator from string
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  const nextRand = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  if (gameId === 'digits3d') {
    // Digits 000 to 999 as 3 separate digits [d1, d2, d3]
    const d1 = Math.floor(nextRand() * 10);
    const d2 = Math.floor(nextRand() * 10);
    const d3 = Math.floor(nextRand() * 10);
    return { winningNumbers: [d1, d2, d3] };
  }

  if (gameId === 'digits2d') {
    // Digits 00 to 99 as 2 digits [d1, d2]
    const d1 = Math.floor(nextRand() * 10);
    const d2 = Math.floor(nextRand() * 10);
    return { winningNumbers: [d1, d2] };
  }

  // Matrix lotteries (mega645, power655, max535) - strictly NO DUPLICATES!
  const available: number[] = [];
  for (let i = game.minNumber; i <= game.maxNumber; i++) {
    available.push(i);
  }

  const chosen: number[] = [];
  for (let i = 0; i < game.pickCount; i++) {
    const idx = Math.floor(nextRand() * available.length);
    chosen.push(available[idx]);
    available.splice(idx, 1);
  }

  // Sort ascending for matrix games
  chosen.sort((a, b) => a - b);

  let specialNumber: number | undefined = undefined;
  if (game.hasSpecialBall && available.length > 0) {
    const idx = Math.floor(nextRand() * available.length);
    specialNumber = available[idx];
  }

  return { winningNumbers: chosen, specialNumber };
}

/**
 * Validates selected numbers for a board
 */
export function validatePickedNumbers(
  gameId: GameId,
  numbers: number[],
  specialNumber?: number
): { valid: boolean; error?: string } {
  const game = LOTTERY_GAMES[gameId];
  if (!game) return { valid: false, error: 'Trò chơi không hợp lệ' };

  if (gameId === 'digits3d') {
    if (numbers.length !== 3) return { valid: false, error: 'Xổ số 3D yêu cầu đúng 3 chữ số (0–9)' };
    for (const d of numbers) {
      if (typeof d !== 'number' || d < 0 || d > 9) return { valid: false, error: 'Chữ số phải trong khoảng 0–9' };
    }
    return { valid: true };
  }

  if (gameId === 'digits2d') {
    if (numbers.length !== 2) return { valid: false, error: 'Xổ số 2D yêu cầu đúng 2 chữ số (0–9)' };
    for (const d of numbers) {
      if (typeof d !== 'number' || d < 0 || d > 9) return { valid: false, error: 'Chữ số phải trong khoảng 0–9' };
    }
    return { valid: true };
  }

  // Matrix games
  if (numbers.length !== game.pickCount) {
    return { valid: false, error: `Phải chọn đủ đúng ${game.pickCount} số` };
  }

  // Check duplicates
  const set = new Set(numbers);
  if (set.size !== numbers.length) {
    return { valid: false, error: 'Không được chọn các số trùng lặp trong cùng một bộ số' };
  }

  // Check bounds
  for (const n of numbers) {
    if (n < game.minNumber || n > game.maxNumber || !Number.isInteger(n)) {
      return { valid: false, error: `Số phải nằm trong khoảng từ ${game.minNumber} đến ${game.maxNumber}` };
    }
  }

  if (game.hasSpecialBall && specialNumber !== undefined) {
    if (specialNumber < game.minNumber || specialNumber > game.maxNumber) {
      return { valid: false, error: `Số đặc biệt phải trong khoảng từ ${game.minNumber} đến ${game.maxNumber}` };
    }
    if (numbers.includes(specialNumber)) {
      return { valid: false, error: 'Số đặc biệt không được trùng với các số chính đã chọn' };
    }
  }

  return { valid: true };
}

/**
 * Checks a ticket against winning numbers and calculates matches and prize payouts
 */
export function evaluateTicket(
  gameId: GameId,
  boards: TicketBoard[],
  winningNumbers: number[],
  specialNumber?: number,
  jackpotPool: number = 0
): { totalWon: number; matches: TicketMatchDetail[] } {
  const game = LOTTERY_GAMES[gameId];
  if (!game) return { totalWon: 0, matches: [] };

  const matches: TicketMatchDetail[] = [];
  let totalWon = 0;

  for (const board of boards) {
    if (gameId === 'digits3d') {
      // winningNumbers is [d1, d2, d3]
      const exact = board.numbers[0] === winningNumbers[0] &&
                    board.numbers[1] === winningNumbers[1] &&
                    board.numbers[2] === winningNumbers[2];

      if (exact) {
        const prize = 10000000;
        matches.push({
          boardId: board.id,
          matchedNumbers: [...board.numbers],
          tierId: 'exact',
          tierName: 'Trùng chính xác (x1000)',
          prizeAmount: prize,
        });
        totalWon += prize;
        continue;
      }

      // Check box match (permutation)
      const sortedPicked = [...board.numbers].sort().join('');
      const sortedWin = [...winningNumbers].sort().join('');
      if (sortedPicked === sortedWin) {
        const prize = 1500000;
        matches.push({
          boardId: board.id,
          matchedNumbers: [...board.numbers],
          tierId: 'box',
          tierName: 'Trùng tổ hợp Box (x150)',
          prizeAmount: prize,
        });
        totalWon += prize;
        continue;
      }

      matches.push({
        boardId: board.id,
        matchedNumbers: [],
        prizeAmount: 0,
      });
      continue;
    }

    if (gameId === 'digits2d') {
      const exact = board.numbers[0] === winningNumbers[0] &&
                    board.numbers[1] === winningNumbers[1];
      if (exact) {
        const prize = 700000;
        matches.push({
          boardId: board.id,
          matchedNumbers: [...board.numbers],
          tierId: 'exact',
          tierName: 'Trùng chính xác 2D (x70)',
          prizeAmount: prize,
        });
        totalWon += prize;
      } else {
        matches.push({
          boardId: board.id,
          matchedNumbers: [],
          prizeAmount: 0,
        });
      }
      continue;
    }

    // Matrix games
    const winningSet = new Set(winningNumbers);
    const matchedNumbers = board.numbers.filter((n) => winningSet.has(n));
    const matchedCount = matchedNumbers.length;
    const matchedSpecial = specialNumber !== undefined && board.specialNumber === specialNumber;

    let highestTierMatch: { tierId: string; tierName: string; prize: number } | null = null;

    if (gameId === 'power655') {
      if (matchedCount === 6) {
        const prize = Math.max(game.prizeTiers[0].basePrize, jackpotPool);
        highestTierMatch = { tierId: 'jackpot1', tierName: 'Jackpot 1', prize };
      } else if (matchedCount === 5 && matchedSpecial) {
        const prize = Math.max(game.prizeTiers[1].basePrize, Math.floor(jackpotPool * 0.15));
        highestTierMatch = { tierId: 'jackpot2', tierName: 'Jackpot 2', prize };
      } else if (matchedCount === 5) {
        highestTierMatch = { tierId: 'tier1', tierName: 'Giải Nhất', prize: 40000000 };
      } else if (matchedCount === 4) {
        highestTierMatch = { tierId: 'tier2', tierName: 'Giải Nhì', prize: 500000 };
      } else if (matchedCount === 3) {
        highestTierMatch = { tierId: 'tier3', tierName: 'Giải Ba', prize: 50000 };
      }
    } else if (gameId === 'mega645') {
      if (matchedCount === 6) {
        const prize = Math.max(game.prizeTiers[0].basePrize, jackpotPool);
        highestTierMatch = { tierId: 'jackpot', tierName: 'Jackpot', prize };
      } else if (matchedCount === 5) {
        highestTierMatch = { tierId: 'tier1', tierName: 'Giải Nhất', prize: 10000000 };
      } else if (matchedCount === 4) {
        highestTierMatch = { tierId: 'tier2', tierName: 'Giải Nhì', prize: 300000 };
      } else if (matchedCount === 3) {
        highestTierMatch = { tierId: 'tier3', tierName: 'Giải Ba', prize: 30000 };
      }
    } else if (gameId === 'max535') {
      if (matchedCount === 5) {
        const prize = Math.max(game.prizeTiers[0].basePrize, jackpotPool);
        highestTierMatch = { tierId: 'jackpot', tierName: 'Giải Đặc Biệt', prize };
      } else if (matchedCount === 4) {
        highestTierMatch = { tierId: 'tier1', tierName: 'Giải Nhất', prize: 5000000 };
      } else if (matchedCount === 3) {
        highestTierMatch = { tierId: 'tier2', tierName: 'Giải Nhì', prize: 100000 };
      } else if (matchedCount === 2) {
        highestTierMatch = { tierId: 'tier3', tierName: 'Giải Ba', prize: 20000 };
      }
    }

    if (highestTierMatch) {
      matches.push({
        boardId: board.id,
        matchedNumbers,
        matchedSpecial,
        tierId: highestTierMatch.tierId,
        tierName: highestTierMatch.tierName,
        prizeAmount: highestTierMatch.prize,
      });
      totalWon += highestTierMatch.prize;
    } else {
      matches.push({
        boardId: board.id,
        matchedNumbers,
        matchedSpecial,
        prizeAmount: 0,
      });
    }
  }

  return { totalWon, matches };
}

/**
 * Verifies Provably Fair integrity
 */
export async function verifyProvablyFair(
  roundId: string,
  commitHash: string,
  revealSeed: string,
  gameId: GameId
): Promise<ProvablyFairVerification> {
  const computedHash = await generateCommitHash(revealSeed, roundId);
  const isValid = computedHash.toLowerCase() === commitHash.toLowerCase();
  const { winningNumbers, specialNumber } = generateDeterministicNumbers(gameId, revealSeed);

  return {
    roundId,
    commitHash,
    revealSeed,
    isValid,
    computedHash,
    computedNumbers: winningNumbers,
    computedSpecial: specialNumber,
  };
}

/**
 * Format currency in Vietnamese style (e.g. 10.000.000 xu)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 xu';
  return `${amount.toLocaleString('vi-VN')} xu`;
}

/**
 * Format 2 or 3 digit number string (01, 007, 45)
 */
export function formatNumber(num: number, pad: number = 2): string {
  return String(num).padStart(pad, '0');
}

/**
 * Generate quick random pick for a game
 */
export function generateQuickPick(gameId: GameId): { numbers: number[]; specialNumber?: number } {
  const game = LOTTERY_GAMES[gameId];
  if (!game) return { numbers: [] };

  if (gameId === 'digits3d') {
    return {
      numbers: [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ],
    };
  }

  if (gameId === 'digits2d') {
    return {
      numbers: [
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ],
    };
  }

  const pool: number[] = [];
  for (let i = game.minNumber; i <= game.maxNumber; i++) {
    pool.push(i);
  }

  const picks: number[] = [];
  for (let i = 0; i < game.pickCount; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }
  picks.sort((a, b) => a - b);

  let specialNumber: number | undefined;
  if (game.hasSpecialBall && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    specialNumber = pool[idx];
  }

  return { numbers: picks, specialNumber };
}
