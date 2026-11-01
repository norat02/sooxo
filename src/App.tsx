/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GameId,
  LotteryRound,
  LotteryTicket,
  UserWallet,
  WalletTransaction,
  UserAchievementProgress,
  ChatMessage,
  Mission,
} from './types/lottery';
import { LOTTERY_GAMES, MISSIONS } from './constants/games';
import { Navbar, ActiveTab } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { DrawStudioView } from './components/DrawStudioView';
import { TicketShop } from './components/TicketShop';
import { MyTicketsView } from './components/MyTicketsView';
import { ResultsHistoryView } from './components/ResultsHistoryView';
import { WalletView } from './components/WalletView';
import { StatsView } from './components/StatsView';
import { MissionsView } from './components/MissionsView';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminView } from './components/AdminView';
import { localDB } from './services/db';
import { sound } from './utils/soundEngine';
import { formatCurrency } from './utils/lotteryEngine';
import confetti from 'canvas-confetti';

const STORAGE_USER_ID = 'norat_user_id';
const STORAGE_USER_NAME = 'norat_user_name';
const STORAGE_USER_AVATAR = 'norat_user_avatar';
const STORAGE_USER_WALLET = 'norat_user_wallet';
const STORAGE_USER_ACHIEVEMENTS = 'norat_user_achievements';

export default function App() {
  // Navigation & Game Selection
  const [activeTab, setActiveTab] = useState<ActiveTab>('lobby');
  const [selectedGameId, setSelectedGameId] = useState<GameId>('mega645');

  // User Profile
  const [userId] = useState<string>(() => {
    let id = localStorage.getItem(STORAGE_USER_ID);
    if (!id) {
      id = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem(STORAGE_USER_ID, id);
    }
    return id;
  });

  const [userName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_USER_NAME) || 'VIP Player ' + Math.floor(Math.random() * 900 + 100);
  });

  const [userAvatar] = useState<string>(() => {
    const avatars = ['🤴', '👑', '🦁', '💎', '🚀', '🍀', '🎯'];
    return localStorage.getItem(STORAGE_USER_AVATAR) || avatars[Math.floor(Math.random() * avatars.length)];
  });

  // Wallet & Transactions
  const [wallet, setWallet] = useState<UserWallet>(() => {
    const saved = localStorage.getItem(STORAGE_USER_WALLET);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // Initial 1,000,000 coins grant for new player!
    return {
      balance: 1000000,
      totalSpent: 0,
      totalWon: 0,
      ticketCount: 0,
      winCount: 0,
    };
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);

  // Achievements Progress
  const [achievements, setAchievements] = useState<UserAchievementProgress>(() => {
    const saved = localStorage.getItem(STORAGE_USER_ACHIEVEMENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      claimedMissions: [],
      roundsJoined: [],
      gamesPlayed: [],
      totalWins: 0,
      totalTicketsBought: 0,
    };
  });

  // Server & Multiplayer State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rounds, setRounds] = useState<Record<GameId, LotteryRound>>({} as Record<GameId, LotteryRound>);
  const [roundHistory, setRoundHistory] = useState<LotteryRound[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentDrawnBall, setCurrentDrawnBall] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Sync wallet & achievements to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_USER_WALLET, JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem(STORAGE_USER_ACHIEVEMENTS, JSON.stringify(achievements));
  }, [achievements]);

  // Load local DB history on mount
  const refreshLocalData = useCallback(async () => {
    const tks = await localDB.getAllTickets();
    const txs = await localDB.getAllTransactions();
    setTickets(tks);
    setTransactions(txs);
  }, []);

  useEffect(() => {
    refreshLocalData();
  }, [refreshLocalData]);

  // Socket.IO Setup
  useEffect(() => {
    const s = io(window.location.origin, {
      reconnectionAttempts: 10,
      timeout: 10000,
    });
    setSocket(s);

    s.on('connect', () => {
      s.emit('user_join', { id: userId, name: userName, avatar: userAvatar });
    });

    s.on('init_sync', (data: { rounds: Record<GameId, LotteryRound>; history: LotteryRound[]; recentChat: ChatMessage[] }) => {
      setRounds(data.rounds);
      setRoundHistory(data.history);
      if (data.recentChat) setChatMessages(data.recentChat);
    });

    s.on('online_users_updated', (data: { count: number; users: { id: string; name: string; avatar: string }[] }) => {
      setOnlineCount(data.count);
      setOnlineUsers(data.users || []);
    });

    s.on('round_created', (data: { gameId: GameId; round: LotteryRound }) => {
      setRounds((prev) => ({ ...prev, [data.gameId]: data.round }));
      setCurrentDrawnBall(null);
    });

    s.on('round_status_changed', (data: { gameId: GameId; roundId: string; status: LotteryRound['status'] }) => {
      setRounds((prev) => {
        const r = prev[data.gameId];
        if (!r || r.id !== data.roundId) return prev;
        return { ...prev, [data.gameId]: { ...r, status: data.status } };
      });
    });

    s.on('ball_drawn', (data: { gameId: GameId; roundId: string; ballNumber: number; isSpecial?: boolean }) => {
      setCurrentDrawnBall(data.ballNumber);
      setRounds((prev) => {
        const r = prev[data.gameId];
        if (!r || r.id !== data.roundId) return prev;
        const newSeq = [...r.drawnSequence, { number: data.ballNumber, isSpecial: data.isSpecial, timestamp: Date.now() }];
        return {
          ...prev,
          [data.gameId]: {
            ...r,
            drawnSequence: newSeq,
            winningNumbers: newSeq.filter((s) => !s.isSpecial).map((s) => s.number),
            specialNumber: newSeq.find((s) => s.isSpecial)?.number,
          },
        };
      });
    });

    s.on('round_completed', (data: { gameId: GameId; round: LotteryRound; winningTickets: { ticketId: string; wonAmount: number }[] }) => {
      setRounds((prev) => ({ ...prev, [data.gameId]: data.round }));
      setRoundHistory((prev) => [data.round, ...prev.slice(0, 49)]);

      // Check if user won on any tickets
      setTickets((prev) =>
        prev.map((t) => {
          if (t.roundId === data.round.id) {
            const winMatch = data.winningTickets?.find((w) => w.ticketId === t.id);
            if (winMatch && winMatch.wonAmount > 0) {
              // Credit user wallet
              const wonAmt = winMatch.wonAmount;
              setWallet((w) => {
                const newBalance = w.balance + wonAmt;
                const newWon = w.totalWon + wonAmt;
                const newWinCount = w.winCount + 1;

                // Log transaction
                const tx: WalletTransaction = {
                  id: `tx_win_${Date.now()}_${Math.floor(Math.random() * 999)}`,
                  userId,
                  type: 'prize_payout',
                  amount: wonAmt,
                  balanceBefore: w.balance,
                  balanceAfter: newBalance,
                  referenceId: t.id,
                  description: `Trả thưởng kỳ ${data.round.id} (${LOTTERY_GAMES[data.gameId].name})`,
                  timestamp: Date.now(),
                };
                localDB.saveTransaction(tx);
                setTransactions((prevTx) => [tx, ...prevTx]);

                return {
                  ...w,
                  balance: newBalance,
                  totalWon: newWon,
                  winCount: newWinCount,
                };
              });

              // Update achievements
              setAchievements((ach) => ({
                ...ach,
                totalWins: ach.totalWins + 1,
              }));

              sound.playWinFanfare();
              confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });

              return { ...t, status: 'won', totalWon: wonAmt };
            } else {
              return { ...t, status: 'lost' };
            }
          }
          return t;
        })
      );
    });

    s.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-40), msg]);
    });

    return () => {
      s.disconnect();
    };
  }, [userId, userName, userAvatar]);

  // Handle Ticket Purchase Success
  const handlePurchaseSuccess = (newTicket: LotteryTicket) => {
    // 1. Deduct wallet
    const newBal = wallet.balance - newTicket.totalCost;
    setWallet((prev) => ({
      ...prev,
      balance: newBal,
      totalSpent: prev.totalSpent + newTicket.totalCost,
      ticketCount: prev.ticketCount + newTicket.boards.length,
    }));

    // 2. Record transaction
    const tx: WalletTransaction = {
      id: `tx_buy_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      userId,
      type: 'ticket_purchase',
      amount: -newTicket.totalCost,
      balanceBefore: wallet.balance,
      balanceAfter: newBal,
      referenceId: newTicket.id,
      description: `Mua vé kỳ ${newTicket.roundId} (${LOTTERY_GAMES[newTicket.gameId].name} - ${newTicket.boards.length} bảng)`,
      timestamp: Date.now(),
    };
    localDB.saveTransaction(tx);
    setTransactions((prev) => [tx, ...prev]);

    // 3. Update tickets state
    setTickets((prev) => [newTicket, ...prev]);

    // 4. Update achievements progress
    setAchievements((prev) => {
      const roundsSet = new Set(prev.roundsJoined);
      roundsSet.add(newTicket.roundId);
      const gamesSet = new Set(prev.gamesPlayed);
      gamesSet.add(newTicket.gameId);

      return {
        ...prev,
        roundsJoined: Array.from(roundsSet),
        gamesPlayed: Array.from(gamesSet),
        totalTicketsBought: prev.totalTicketsBought + newTicket.boards.length,
      };
    });

    // 5. Emit to socket server
    if (socket) {
      socket.emit('buy_ticket', { ticket: newTicket });
    }
  };

  // Handle Cancel Ticket
  const handleCancelTicket = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status !== 'pending') return;

    if (socket) {
      socket.emit('cancel_ticket', { ticketId }, (res: { success: boolean; refundedAmount?: number; error?: string }) => {
        if (res.success) {
          const refund = res.refundedAmount || ticket.totalCost;
          const newBal = wallet.balance + refund;

          setWallet((prev) => ({
            ...prev,
            balance: newBal,
            totalSpent: Math.max(0, prev.totalSpent - refund),
          }));

          const tx: WalletTransaction = {
            id: `tx_ref_${Date.now()}_${Math.floor(Math.random() * 999)}`,
            userId,
            type: 'ticket_refund',
            amount: refund,
            balanceBefore: wallet.balance,
            balanceAfter: newBal,
            referenceId: ticket.id,
            description: `Hoàn tiền hủy vé ${ticket.id}`,
            timestamp: Date.now(),
          };
          localDB.saveTransaction(tx);
          setTransactions((prev) => [tx, ...prev]);

          // Update ticket status
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, status: 'cancelled' } : t))
          );
        } else {
          alert(res.error || 'Không thể hủy vé lúc này');
        }
      });
    }
  };

  // Claim Daily Bonus (+50,000 xu)
  const handleClaimDaily = () => {
    const reward = 50000;
    const newBal = wallet.balance + reward;
    setWallet((prev) => ({
      ...prev,
      balance: newBal,
      lastDailyClaim: Date.now(),
    }));

    const tx: WalletTransaction = {
      id: `tx_daily_${Date.now()}`,
      userId,
      type: 'daily_reward',
      amount: reward,
      balanceBefore: wallet.balance,
      balanceAfter: newBal,
      description: 'Phần thưởng điểm danh hàng ngày',
      timestamp: Date.now(),
    };
    localDB.saveTransaction(tx);
    setTransactions((prev) => [tx, ...prev]);
  };

  // Spin Lucky Wheel (+10,000 to +200,000 xu)
  const handleSpinLuckyWheel = (wonAmt: number) => {
    const newBal = wallet.balance + wonAmt;
    setWallet((prev) => ({
      ...prev,
      balance: newBal,
      lastLuckySpin: Date.now(),
    }));

    const tx: WalletTransaction = {
      id: `tx_spin_${Date.now()}`,
      userId,
      type: 'lucky_spin',
      amount: wonAmt,
      balanceBefore: wallet.balance,
      balanceAfter: newBal,
      description: 'Vòng quay may mắn nhận xu miễn phí',
      timestamp: Date.now(),
    };
    localDB.saveTransaction(tx);
    setTransactions((prev) => [tx, ...prev]);
  };

  // Claim Mission Reward
  const handleClaimMission = (mission: Mission) => {
    const newBal = wallet.balance + mission.rewardCoins;
    setWallet((prev) => ({
      ...prev,
      balance: newBal,
    }));

    setAchievements((prev) => ({
      ...prev,
      claimedMissions: [...prev.claimedMissions, mission.id],
    }));

    const tx: WalletTransaction = {
      id: `tx_msn_${Date.now()}`,
      userId,
      type: 'mission_reward',
      amount: mission.rewardCoins,
      balanceBefore: wallet.balance,
      balanceAfter: newBal,
      description: `Thưởng thành tựu: ${mission.title}`,
      timestamp: Date.now(),
    };
    localDB.saveTransaction(tx);
    setTransactions((prev) => [tx, ...prev]);
  };

  // Send Chat message
  const handleSendMessage = (text: string) => {
    if (socket) {
      socket.emit('send_chat', {
        text,
        userId,
        userName,
        userAvatar,
      });
    }
  };

  // Host trigger draw
  const handleTriggerDraw = (gameId: GameId, pin: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, error: 'Chưa kết nối máy chủ' });
        return;
      }
      socket.emit('admin_trigger_draw', { gameId, pin }, (res: { success: boolean; message?: string; error?: string }) => {
        resolve(res);
      });
    });
  };

  const unreadWonTickets = tickets.filter((t) => t.status === 'won').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        balance={wallet.balance}
        userName={userName}
        userAvatar={userAvatar}
        onlineCount={onlineCount}
        isMuted={isMuted}
        onToggleMute={() => {
          const m = sound.toggleMute();
          setIsMuted(m);
        }}
        unreadWonTickets={unreadWonTickets}
      />

      {/* Main Content Dynamic Views */}
      <main className="flex-1 pb-12">
        {activeTab === 'lobby' && (
          <LobbyView
            rounds={rounds}
            onSelectGameAndTab={(gid, tab) => {
              setSelectedGameId(gid);
              setActiveTab(tab);
            }}
            recentResults={roundHistory}
            onOpenRules={() => {}}
            onlineCount={onlineCount}
          />
        )}

        {activeTab === 'draw_studio' && (
          <DrawStudioView
            selectedGameId={selectedGameId}
            onSelectGame={setSelectedGameId}
            activeRound={rounds[selectedGameId]}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
            userName={userName}
            userAvatar={userAvatar}
            onNavigateToShop={() => setActiveTab('buy_ticket')}
            currentDrawnBall={currentDrawnBall}
          />
        )}

        {activeTab === 'buy_ticket' && (
          <TicketShop
            selectedGameId={selectedGameId}
            onSelectGame={setSelectedGameId}
            activeRound={rounds[selectedGameId]}
            userBalance={wallet.balance}
            userName={userName}
            userAvatar={userAvatar}
            userId={userId}
            onPurchaseSuccess={handlePurchaseSuccess}
            onSwitchToStudio={() => setActiveTab('draw_studio')}
            lastTicket={tickets[0]}
          />
        )}

        {activeTab === 'my_tickets' && (
          <MyTicketsView
            tickets={tickets}
            onCancelTicket={handleCancelTicket}
            onNavigateToShop={() => setActiveTab('buy_ticket')}
          />
        )}

        {activeTab === 'results' && <ResultsHistoryView history={roundHistory} />}

        {activeTab === 'wallet' && (
          <WalletView
            wallet={wallet}
            transactions={transactions}
            onClaimDaily={handleClaimDaily}
            onSpinLuckyWheel={handleSpinLuckyWheel}
            onRefreshData={refreshLocalData}
          />
        )}

        {activeTab === 'stats' && <StatsView history={roundHistory} />}

        {activeTab === 'missions' && (
          <MissionsView progress={achievements} onClaimMission={handleClaimMission} />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            onlineUsers={onlineUsers}
            currentUserName={userName}
            currentUserBalance={wallet.balance}
            currentUserWon={wallet.totalWon}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView rounds={rounds} onTriggerDraw={handleTriggerDraw} />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-semibold text-slate-400">
            NORAT LOTTERY 3D — HỆ THỐNG XỔ SỐ MÔ PHỎNG 3D THỜI GIAN THỰC
          </p>
          <p className="text-[11px] text-slate-500">
            Trò chơi giải trí sử dụng tiền ảo trong game. Không sử dụng tiền thật, không hỗ trợ nạp/rút tiền.
            Thuật toán Provably Fair cam kết tính công bằng và ngẫu nhiên bảo mật 100%.
          </p>
        </div>
      </footer>
    </div>
  );
}
