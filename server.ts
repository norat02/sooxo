/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GameId, LotteryRound, LotteryTicket, ChatMessage } from './src/types/lottery';
import { LOTTERY_GAMES } from './src/constants/games';
import {
  generateDeterministicNumbers,
  evaluateTicket,
  validatePickedNumbers,
} from './src/utils/lotteryEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});

app.use(express.json());

// In-memory Server State
interface ServerState {
  rounds: Record<GameId, LotteryRound>;
  roundHistory: LotteryRound[];
  allTickets: Map<string, LotteryTicket>;
  onlineUsers: Map<string, { id: string; name: string; avatar: string }>;
  chatMessages: ChatMessage[];
  adminPin: string;
}

const state: ServerState = {
  rounds: {} as Record<GameId, LotteryRound>,
  roundHistory: [],
  allTickets: new Map(),
  onlineUsers: new Map(),
  chatMessages: [
    {
      id: 'welcome_1',
      userId: 'system',
      userName: 'Hệ thống NORAT',
      userAvatar: '🎰',
      text: 'Chào mừng quý khách đến với Sảnh Xổ Số 3D Đẳng Cấp NORAT! Chúc bạn may mắn.',
      timestamp: Date.now(),
      type: 'system',
    },
  ],
  adminPin: '8888',
};

// Cryptographic SHA-256 helper
function sha256Sync(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Generate new round for a game
function createNewRound(gameId: GameId, durationSeconds = 90): LotteryRound {
  const game = LOTTERY_GAMES[gameId];
  const roundNum = state.rounds[gameId] ? state.rounds[gameId].roundNumber + 1 : 1001;
  const roundId = `R-${gameId.toUpperCase()}-${roundNum}`;
  const now = Date.now();
  const closeTime = now + (durationSeconds - 15) * 1000;
  const drawTime = now + durationSeconds * 1000;

  // Generate cryptographic secret seed
  const secretSeed = crypto.randomBytes(32).toString('hex');
  const commitHash = sha256Sync(`${secretSeed}:${roundId}`);

  // Base jackpot or rolling jackpot
  const prevRound = state.rounds[gameId];
  let jackpotPool = game.prizeTiers[0].basePrize;
  if (prevRound && prevRound.jackpotPool) {
    jackpotPool = prevRound.jackpotPool + Math.floor(Math.random() * 5000000 + 2000000);
  }

  const round: LotteryRound = {
    id: roundId,
    gameId,
    roundNumber: roundNum,
    status: 'betting',
    createdAt: now,
    closeTime,
    drawTime,
    commitHash,
    revealSeed: secretSeed, // stored on server, revealed only when completed!
    winningNumbers: [],
    drawnSequence: [],
    currentDrawnIndex: 0,
    jackpotPool,
    totalTicketsSold: 0,
    totalPrizesPaid: 0,
  };

  return round;
}

// Initialize all 5 games
const gameIds: GameId[] = ['mega645', 'power655', 'max535', 'digits3d', 'digits2d'];
for (const gid of gameIds) {
  state.rounds[gid] = createNewRound(gid, 100);
}

// Drawing Routine Runner
async function executeDraw(gameId: GameId) {
  const round = state.rounds[gameId];
  if (!round || round.status === 'drawing' || round.status === 'completed') return;

  round.status = 'drawing';
  io.emit('round_status_changed', { gameId, roundId: round.id, status: 'drawing' });

  // Generate winning numbers using seed
  const { winningNumbers, specialNumber } = generateDeterministicNumbers(gameId, round.revealSeed!);
  round.winningNumbers = winningNumbers;
  round.specialNumber = specialNumber;

  // Sequential ball draw animation events
  const drawList = winningNumbers.map((n) => ({ number: n, isSpecial: false }));
  if (specialNumber !== undefined) {
    drawList.push({ number: specialNumber, isSpecial: true });
  }

  for (let idx = 0; idx < drawList.length; idx++) {
    // Wait ~2.5s between balls for dramatic 3D animation
    await new Promise((res) => setTimeout(res, 2500));

    const item = drawList[idx];
    round.drawnSequence.push({
      number: item.number,
      isSpecial: item.isSpecial,
      timestamp: Date.now(),
    });
    round.currentDrawnIndex = idx + 1;

    io.emit('ball_drawn', {
      gameId,
      roundId: round.id,
      ballNumber: item.number,
      isSpecial: item.isSpecial,
      index: idx,
      totalBalls: drawList.length,
    });
  }

  // Draw finished: evaluate all tickets for this round
  await new Promise((res) => setTimeout(res, 2000));
  round.status = 'completed';
  round.completedAt = Date.now();

  let roundPrizesTotal = 0;
  const winningTicketsToNotify: { ticketId: string; userName: string; wonAmount: number; tierName: string }[] = [];

  for (const [ticketId, ticket] of state.allTickets.entries()) {
    if (ticket.roundId === round.id && ticket.status === 'pending') {
      const evaluation = evaluateTicket(
        ticket.gameId,
        ticket.boards,
        round.winningNumbers,
        round.specialNumber,
        round.jackpotPool
      );

      ticket.matches = evaluation.matches;
      ticket.totalWon = evaluation.totalWon;
      ticket.status = evaluation.totalWon > 0 ? 'won' : 'lost';

      if (evaluation.totalWon > 0) {
        roundPrizesTotal += evaluation.totalWon;
        const highestMatch = evaluation.matches.find((m) => m.prizeAmount > 0);
        winningTicketsToNotify.push({
          ticketId,
          userName: ticket.userName,
          wonAmount: evaluation.totalWon,
          tierName: highestMatch?.tierName || 'Trúng thưởng',
        });
      }
    }
  }

  round.totalPrizesPaid = roundPrizesTotal;

  // Archive round to history
  const roundPublicData = {
    ...round,
    revealSeed: round.revealSeed, // Reveal seed publicly now for provably fair verification!
  };
  state.roundHistory.unshift(roundPublicData);
  if (state.roundHistory.length > 200) state.roundHistory.pop();

  io.emit('round_completed', {
    gameId,
    round: roundPublicData,
    winningTickets: winningTicketsToNotify,
  });

  // Broadcast celebratory system chat if there were winners
  for (const w of winningTicketsToNotify) {
    if (w.wonAmount >= 100000) {
      const chatMsg: ChatMessage = {
        id: `jackpot_${Date.now()}_${Math.random()}`,
        userId: 'system',
        userName: 'Hệ thống NORAT',
        userAvatar: '🎉',
        text: `Chúc mừng người chơi ${w.userName} vừa trúng ${w.tierName} trị giá ${w.wonAmount.toLocaleString('vi-VN')} xu!`,
        timestamp: Date.now(),
        type: 'jackpot',
      };
      state.chatMessages.push(chatMsg);
      io.emit('chat_message', chatMsg);
    }
  }

  // Create next round after 8 seconds
  setTimeout(() => {
    state.rounds[gameId] = createNewRound(gameId, 100);
    const sanitizedNewRound = {
      ...state.rounds[gameId],
      revealSeed: undefined, // Hide seed until completed!
    };
    io.emit('round_created', { gameId, round: sanitizedNewRound });
  }, 8000);
}

// Master Tick: checks countdowns every second
setInterval(() => {
  const now = Date.now();
  for (const gid of gameIds) {
    const round = state.rounds[gid];
    if (!round) continue;

    if (round.status === 'betting' && now >= round.closeTime) {
      round.status = 'closed';
      io.emit('round_status_changed', { gameId: gid, roundId: round.id, status: 'closed' });
    }

    if ((round.status === 'betting' || round.status === 'closed') && now >= round.drawTime) {
      executeDraw(gid);
    }
  }
}, 1000);

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Get current state of all rounds and history
app.get('/api/lottery/state', (req, res) => {
  const sanitizedRounds: Record<string, Partial<LotteryRound>> = {};
  for (const [gid, r] of Object.entries(state.rounds)) {
    sanitizedRounds[gid] = {
      ...r,
      revealSeed: r.status === 'completed' ? r.revealSeed : undefined,
    };
  }
  res.json({
    rounds: sanitizedRounds,
    history: state.roundHistory.slice(0, 30),
    onlineCount: state.onlineUsers.size,
  });
});

// Socket.IO Handling
io.on('connection', (socket) => {
  socket.on('user_join', (user: { id: string; name: string; avatar: string }) => {
    state.onlineUsers.set(socket.id, user);
    io.emit('online_users_updated', {
      count: state.onlineUsers.size,
      users: Array.from(state.onlineUsers.values()).slice(0, 20),
    });

    // Send initial snapshot
    const sanitizedRounds: Record<string, Partial<LotteryRound>> = {};
    for (const [gid, r] of Object.entries(state.rounds)) {
      sanitizedRounds[gid] = {
        ...r,
        revealSeed: r.status === 'completed' ? r.revealSeed : undefined,
      };
    }

    socket.emit('init_sync', {
      rounds: sanitizedRounds,
      history: state.roundHistory.slice(0, 30),
      recentChat: state.chatMessages.slice(-25),
    });
  });

  // Ticket Purchase
  socket.on('buy_ticket', (payload: { ticket: LotteryTicket }, ack) => {
    const ticket = payload.ticket;
    const round = state.rounds[ticket.gameId];

    if (!round || round.id !== ticket.roundId) {
      if (ack) ack({ success: false, error: 'Kỳ quay không tồn tại hoặc đã chuyển kỳ mới' });
      return;
    }

    if (round.status !== 'betting' || Date.now() >= round.closeTime) {
      if (ack) ack({ success: false, error: 'Kỳ quay đã đóng cổng mua vé, xin chờ kỳ tiếp theo' });
      return;
    }

    // Validate boards
    for (const b of ticket.boards) {
      const v = validatePickedNumbers(ticket.gameId, b.numbers, b.specialNumber);
      if (!v.valid) {
        if (ack) ack({ success: false, error: v.error });
        return;
      }
    }

    // Deduplication check
    if (state.allTickets.has(ticket.id)) {
      if (ack) ack({ success: false, error: 'Mã vé đã tồn tại' });
      return;
    }

    // Save ticket
    state.allTickets.set(ticket.id, ticket);
    round.totalTicketsSold += ticket.boards.length;
    round.jackpotPool += Math.floor(ticket.totalCost * 0.55); // 55% goes to jackpot pool

    io.emit('ticket_purchased_broadcast', {
      gameId: ticket.gameId,
      roundId: round.id,
      ticketCount: ticket.boards.length,
      buyerName: ticket.userName,
    });

    if (ack) ack({ success: true, ticket });
  });

  // Cancel Ticket
  socket.on('cancel_ticket', (payload: { ticketId: string }, ack) => {
    const ticket = state.allTickets.get(payload.ticketId);
    if (!ticket) {
      if (ack) ack({ success: false, error: 'Không tìm thấy vé' });
      return;
    }

    const round = state.rounds[ticket.gameId];
    if (!round || round.status !== 'betting' || Date.now() >= round.closeTime) {
      if (ack) ack({ success: false, error: 'Kỳ quay đã đóng, không thể hủy vé' });
      return;
    }

    ticket.status = 'cancelled';
    ticket.cancelledAt = Date.now();
    round.totalTicketsSold = Math.max(0, round.totalTicketsSold - ticket.boards.length);
    round.jackpotPool = Math.max(0, round.jackpotPool - Math.floor(ticket.totalCost * 0.55));

    if (ack) ack({ success: true, ticketId: ticket.id, refundedAmount: ticket.totalCost });
  });

  // Chat message
  socket.on('send_chat', (msg: { text: string; userId: string; userName: string; userAvatar: string }) => {
    const chatMsg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random()}`,
      userId: msg.userId,
      userName: msg.userName,
      userAvatar: msg.userAvatar || '🧑',
      text: msg.text.slice(0, 150),
      timestamp: Date.now(),
      type: 'chat',
    };
    state.chatMessages.push(chatMsg);
    if (state.chatMessages.length > 100) state.chatMessages.shift();
    io.emit('chat_message', chatMsg);
  });

  // Host/Admin Trigger Draw Now
  socket.on('admin_trigger_draw', (payload: { pin: string; gameId: GameId }, ack) => {
    if (payload.pin !== state.adminPin) {
      if (ack) ack({ success: false, error: 'Mã PIN quản trị không chính xác' });
      return;
    }

    const round = state.rounds[payload.gameId];
    if (!round) {
      if (ack) ack({ success: false, error: 'Trò chơi không hợp lệ' });
      return;
    }

    if (round.status === 'drawing') {
      if (ack) ack({ success: false, error: 'Kỳ quay đang diễn ra' });
      return;
    }

    // Force close betting and start draw
    round.status = 'closed';
    round.closeTime = Date.now();
    round.drawTime = Date.now();
    executeDraw(payload.gameId);

    if (ack) ack({ success: true, message: `Đã kích hoạt quay số kỳ ${round.id}` });
  });

  socket.on('disconnect', () => {
    state.onlineUsers.delete(socket.id);
    io.emit('online_users_updated', {
      count: state.onlineUsers.size,
      users: Array.from(state.onlineUsers.values()).slice(0, 20),
    });
  });
});

// Vite Middleware integration in dev, or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[NORAT LOTTERY 3D] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

export { app, server, state, createNewRound, executeDraw };
