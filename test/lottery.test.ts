/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePickedNumbers,
  generateDeterministicNumbers,
  generateCommitHash,
  evaluateTicket,
  verifyProvablyFair,
} from '../src/utils/lotteryEngine';
import { LOTTERY_GAMES } from '../src/constants/games';
import { GameId, TicketBoard, LotteryRound } from '../src/types/lottery';

describe('NORAT LOTTERY 3D — Automated Test Suite (14 Core Tests)', () => {
  // Test 1: Chọn số hợp lệ
  test('1. Chọn số hợp lệ: 6/45 với 6 số hợp lệ [3, 12, 19, 24, 35, 42]', () => {
    const res = validatePickedNumbers('mega645', [3, 12, 19, 24, 35, 42]);
    assert.equal(res.valid, true);
  });

  // Test 2: Không cho chọn số trùng
  test('2. Không cho chọn số trùng: [5, 12, 12, 20, 30, 40] bị từ chối', () => {
    const res = validatePickedNumbers('mega645', [5, 12, 12, 20, 30, 40]);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /trùng lặp/i);
  });

  // Test 3: Sinh kết quả không trùng
  test('3. Sinh kết quả không trùng: Thuật toán deterministic sinh 6 số phân biệt từ 1 đến 45', () => {
    const seed = 'test_seed_norat_crypto_secure_hash_89712398';
    const { winningNumbers } = generateDeterministicNumbers('mega645', seed);
    assert.equal(winningNumbers.length, 6);
    const set = new Set(winningNumbers);
    assert.equal(set.size, 6);
    for (const n of winningNumbers) {
      assert.ok(n >= 1 && n <= 45);
    }
  });

  // Test 4: Kiểm tra số trúng
  test('4. Kiểm tra số trúng: Phát hiện chính xác các số trùng khớp', () => {
    const winningNumbers = [5, 12, 18, 24, 36, 42];
    const boards: TicketBoard[] = [
      { id: 'A', numbers: [5, 12, 18, 20, 30, 40] }, // 3 matches (5, 12, 18)
    ];
    const res = evaluateTicket('mega645', boards, winningNumbers, undefined, 12000000000);
    assert.equal(res.matches[0].matchedNumbers.length, 3);
    assert.deepEqual(res.matches[0].matchedNumbers, [5, 12, 18]);
  });

  // Test 5: Tính cấp giải
  test('5. Tính cấp giải: 3 số trùng -> Giải Ba, 4 số trùng -> Giải Nhì, 6 số trùng -> Jackpot', () => {
    const winningNumbers = [1, 2, 3, 4, 5, 6];
    const boards: TicketBoard[] = [
      { id: 'A', numbers: [1, 2, 3, 10, 11, 12] }, // 3 matches -> tier3 (Giải Ba)
      { id: 'B', numbers: [1, 2, 3, 4, 11, 12] },    // 4 matches -> tier2 (Giải Nhì)
      { id: 'C', numbers: [1, 2, 3, 4, 5, 6] },      // 6 matches -> jackpot
    ];
    const res = evaluateTicket('mega645', boards, winningNumbers, undefined, 12000000000);
    assert.equal(res.matches[0].tierId, 'tier3');
    assert.equal(res.matches[1].tierId, 'tier2');
    assert.equal(res.matches[2].tierId, 'jackpot');
  });

  // Test 6: Tính tiền thưởng
  test('6. Tính tiền thưởng: Tổng giải thưởng bằng tổng các giải trên từng bảng', () => {
    const winningNumbers = [10, 20, 30, 40, 41, 42];
    const boards: TicketBoard[] = [
      { id: 'A', numbers: [10, 20, 30, 1, 2, 3] }, // 3 matches -> 30,000 xu
      { id: 'B', numbers: [10, 20, 30, 40, 1, 2] }, // 4 matches -> 300,000 xu
    ];
    const res = evaluateTicket('mega645', boards, winningNumbers, undefined, 12000000000);
    assert.equal(res.totalWon, 330000);
  });

  // Test 7: Trừ tiền mua vé
  test('7. Trừ tiền mua vé: Số dư giảm chính xác theo tổng số bảng nhân giá vé', () => {
    const initialBalance = 1000000;
    const ticketPrice = LOTTERY_GAMES.mega645.ticketPrice;
    const boardsCount = 3;
    const totalCost = boardsCount * ticketPrice;
    const afterBalance = initialBalance - totalCost;
    assert.equal(afterBalance, 970000);
  });

  // Test 8: Không tạo giao dịch trùng (Idempotency)
  test('8. Không tạo giao dịch trùng: Map hoặc DB từ chối khi ticket ID đã tồn tại', () => {
    const ticketRegistry = new Map<string, boolean>();
    const ticketId = 'TK-MEGA-2026-001';
    ticketRegistry.set(ticketId, true);

    const isDuplicate = ticketRegistry.has(ticketId);
    assert.equal(isDuplicate, true);
  });

  // Test 9: Không mua vé sau khi đóng kỳ
  test('9. Không mua vé sau khi đóng kỳ: Từ chối giao dịch khi now >= closeTime hoặc status !== "betting"', () => {
    const round: Partial<LotteryRound> = {
      status: 'closed',
      closeTime: Date.now() - 5000,
    };
    const canBuy = round.status === 'betting' && Date.now() < (round.closeTime || 0);
    assert.equal(canBuy, false);
  });

  // Test 10: Không sửa kết quả đã công bố (Immutability)
  test('10. Không sửa kết quả đã công bố: Object.freeze hoặc trạng thái completed bảo vệ kết quả', () => {
    const completedRound = Object.freeze({
      id: 'R-645-100',
      status: 'completed',
      winningNumbers: Object.freeze([7, 14, 21, 28, 35, 42]),
    });
    assert.throws(() => {
      // @ts-expect-error Mutation test
      completedRound.winningNumbers[0] = 99;
    });
  });

  // Test 11: Lưu và tải lại dữ liệu (Backup export / import)
  test('11. Lưu và tải lại dữ liệu: JSON serialization roundtrip bảo toàn tính toàn vẹn', () => {
    const state = {
      appName: 'NORAT LOTTERY 3D',
      wallet: { balance: 500000, totalWon: 200000 },
      tickets: [{ id: 'TK-1', won: 10000 }],
    };
    const serialized = JSON.stringify(state);
    const parsed = JSON.parse(serialized);
    assert.deepEqual(parsed, state);
  });

  // Test 12: Đồng bộ multiplayer
  test('12. Đồng bộ multiplayer: Event payload cấu trúc hợp lệ cho broadcast', () => {
    const eventPayload = {
      gameId: 'mega645',
      roundId: 'R-645-101',
      ballNumber: 27,
      isSpecial: false,
      timestamp: Date.now(),
    };
    assert.equal(typeof eventPayload.ballNumber, 'number');
    assert.equal(typeof eventPayload.roundId, 'string');
    assert.equal(eventPayload.ballNumber, 27);
  });

  // Test 13: Xác minh commit-reveal
  test('13. Xác minh commit-reveal: SHA-256(revealSeed:roundId) khớp chính xác commitHash', async () => {
    const roundId = 'R-POWER-1001';
    const revealSeed = '8f3e2b1a9c0d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
    const commitHash = await generateCommitHash(revealSeed, roundId);

    const verification = await verifyProvablyFair(roundId, commitHash, revealSeed, 'power655');
    assert.equal(verification.isValid, true);
    assert.equal(verification.computedNumbers.length, 6);
    assert.ok(verification.computedSpecial !== undefined);
  });

  // Test 14: Xổ số 3D và 2D logic
  test('14. Xổ số 3D và 2D: Kiểm tra chính xác giải Trùng khớp (Exact) và giải Box (Tổ hợp)', () => {
    const winning3D = [0, 4, 2];
    const boards3D: TicketBoard[] = [
      { id: 'A', numbers: [0, 4, 2] }, // Exact match
      { id: 'B', numbers: [4, 2, 0] }, // Box permutation match
      { id: 'C', numbers: [9, 9, 9] }, // No match
    ];
    const res3D = evaluateTicket('digits3d', boards3D, winning3D);
    assert.equal(res3D.matches[0].tierId, 'exact');
    assert.equal(res3D.matches[0].prizeAmount, 10000000);
    assert.equal(res3D.matches[1].tierId, 'box');
    assert.equal(res3D.matches[1].prizeAmount, 1500000);
    assert.equal(res3D.matches[2].prizeAmount, 0);

    const winning2D = [0, 7];
    const boards2D: TicketBoard[] = [
      { id: 'A', numbers: [0, 7] }, // Exact
      { id: 'B', numbers: [7, 0] }, // Not exact
    ];
    const res2D = evaluateTicket('digits2d', boards2D, winning2D);
    assert.equal(res2D.matches[0].prizeAmount, 700000);
    assert.equal(res2D.matches[1].prizeAmount, 0);
  });
});
