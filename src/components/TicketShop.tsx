/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameId, TicketBoard, LotteryRound, LotteryTicket } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import {
  validatePickedNumbers,
  generateQuickPick,
  formatCurrency,
  formatNumber,
} from '../utils/lotteryEngine';
import { sound } from '../utils/soundEngine';
import { localDB } from '../services/db';
import {
  Dices,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Copy,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface TicketShopProps {
  selectedGameId: GameId;
  onSelectGame: (gameId: GameId) => void;
  activeRound?: LotteryRound;
  userBalance: number;
  userName: string;
  userAvatar: string;
  userId: string;
  onPurchaseSuccess: (ticket: LotteryTicket) => void;
  onSwitchToStudio: () => void;
  lastTicket?: LotteryTicket;
}

export const TicketShop: React.FC<TicketShopProps> = ({
  selectedGameId,
  onSelectGame,
  activeRound,
  userBalance,
  userName,
  userAvatar,
  userId,
  onPurchaseSuccess,
  onSwitchToStudio,
  lastTicket,
}) => {
  const game = LOTTERY_GAMES[selectedGameId];

  // Active boards being configured (A, B, C, etc.)
  const [boards, setBoards] = useState<TicketBoard[]>([
    { id: 'A', numbers: [] },
  ]);
  const [activeBoardId, setActiveBoardId] = useState<string>('A');

  // Favorites state
  const [savedFavorites, setSavedFavorites] = useState<{ id: string; name: string; numbers: number[]; specialNumber?: number }[]>([]);
  const [isFavoriteSaved, setIsFavoriteSaved] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load favorites for this game
  useEffect(() => {
    localDB.getFavorites(selectedGameId).then((favs) => {
      setSavedFavorites(favs);
    });
  }, [selectedGameId]);

  // Reset boards when switching game
  useEffect(() => {
    setBoards([{ id: 'A', numbers: [] }]);
    setActiveBoardId('A');
    setErrorMessage(null);
  }, [selectedGameId]);

  const currentBoard = boards.find((b) => b.id === activeBoardId) || boards[0];

  // Toggle or select number on the current board
  const handleNumberClick = (num: number) => {
    sound.playClick();
    setErrorMessage(null);

    const currentNumbers = [...currentBoard.numbers];
    const index = currentNumbers.indexOf(num);

    if (index >= 0) {
      // Remove
      currentNumbers.splice(index, 1);
    } else {
      // Add if under pick count
      if (currentNumbers.length >= game.pickCount) {
        setErrorMessage(`Bộ số đã đủ ${game.pickCount} số.`);
        return;
      }
      currentNumbers.push(num);
      currentNumbers.sort((a, b) => a - b);
    }

    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoardId ? { ...b, numbers: currentNumbers } : b))
    );
  };

  // Select special number (for Power 6/55)
  const handleSpecialNumberClick = (num: number) => {
    sound.playClick();
    setBoards((prev) =>
      prev.map((b) =>
        b.id === activeBoardId
          ? { ...b, specialNumber: b.specialNumber === num ? undefined : num }
          : b
      )
    );
  };

  // Quick pick single board
  const handleQuickPickBoard = (boardId: string) => {
    sound.playClick();
    const pick = generateQuickPick(selectedGameId);
    setBoards((prev) =>
      prev.map((b) =>
        b.id === boardId
          ? { ...b, numbers: pick.numbers, specialNumber: pick.specialNumber }
          : b
      )
    );
  };

  // Quick pick ALL boards
  const handleQuickPickAll = () => {
    sound.playClick();
    setBoards((prev) =>
      prev.map((b) => {
        const pick = generateQuickPick(selectedGameId);
        return { ...b, numbers: pick.numbers, specialNumber: pick.specialNumber };
      })
    );
  };

  // Clear current board
  const handleClearBoard = (boardId: string) => {
    sound.playClick();
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, numbers: [], specialNumber: undefined } : b))
    );
  };

  // Add new board (up to F = 6 boards per ticket)
  const handleAddBoard = () => {
    sound.playClick();
    if (boards.length >= 6) return;
    const nextLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextLetter = nextLetters[boards.length];
    const newBoard: TicketBoard = { id: nextLetter, numbers: [] };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(nextLetter);
  };

  // Remove board
  const handleRemoveBoard = (boardId: string) => {
    sound.playClick();
    if (boards.length <= 1) return;
    const filtered = boards.filter((b) => b.id !== boardId);
    // Re-index boards
    const reindexed = filtered.map((b, idx) => ({
      ...b,
      id: ['A', 'B', 'C', 'D', 'E', 'F'][idx],
    }));
    setBoards(reindexed);
    setActiveBoardId(reindexed[0].id);
  };

  // Save current board to favorites
  const handleSaveFavorite = async () => {
    if (currentBoard.numbers.length !== game.pickCount) {
      setErrorMessage(`Chọn đủ ${game.pickCount} số để lưu bộ số yêu thích`);
      return;
    }
    sound.playClick();
    const favItem = {
      id: `fav_${Date.now()}`,
      gameId: selectedGameId,
      name: `Bộ số may mắn ${currentBoard.numbers.slice(0, 3).join('-')}`,
      numbers: [...currentBoard.numbers],
      specialNumber: currentBoard.specialNumber,
      createdAt: Date.now(),
    };
    await localDB.saveFavorite(favItem);
    setSavedFavorites((prev) => [favItem, ...prev]);
    setIsFavoriteSaved(true);
    setTimeout(() => setIsFavoriteSaved(false), 2000);
  };

  // Load a favorite set into current board
  const handleLoadFavorite = (numbers: number[], special?: number) => {
    sound.playClick();
    setBoards((prev) =>
      prev.map((b) =>
        b.id === activeBoardId
          ? { ...b, numbers: [...numbers], specialNumber: special }
          : b
      )
    );
  };

  // Copy from last purchased ticket
  const handleCopyLastTicket = () => {
    if (!lastTicket || lastTicket.gameId !== selectedGameId) return;
    sound.playClick();
    setBoards(
      lastTicket.boards.map((b, idx) => ({
        id: ['A', 'B', 'C', 'D', 'E', 'F'][idx] || b.id,
        numbers: [...b.numbers],
        specialNumber: b.specialNumber,
      }))
    );
  };

  // Calculate total ticket price
  const totalCost = boards.length * game.ticketPrice;
  const isBettingOpen = activeRound && activeRound.status === 'betting' && Date.now() < activeRound.closeTime;

  // Handle ticket purchase
  const handleBuyTicket = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!isBettingOpen) {
      setErrorMessage('Kỳ quay đã đóng cổng nhận vé hoặc đang quay thưởng. Vui lòng chờ kỳ tiếp theo.');
      return;
    }

    if (userBalance < totalCost) {
      setErrorMessage(`Số dư không đủ. Cần ${formatCurrency(totalCost)}, số dư hiện có: ${formatCurrency(userBalance)}.`);
      return;
    }

    // Validate all boards
    for (const b of boards) {
      const v = validatePickedNumbers(selectedGameId, b.numbers, b.specialNumber);
      if (!v.valid) {
        setErrorMessage(`Bảng ${b.id}: ${v.error}`);
        setActiveBoardId(b.id);
        return;
      }
    }

    setIsSubmitting(true);
    sound.playClick();

    const ticketId = `TK-${selectedGameId.toUpperCase()}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const newTicket: LotteryTicket = {
      id: ticketId,
      userId,
      userName,
      userAvatar,
      gameId: selectedGameId,
      roundId: activeRound.id,
      roundNumber: activeRound.roundNumber,
      boards: boards.map((b) => ({ ...b })),
      totalCost,
      purchasedAt: Date.now(),
      status: 'pending',
      totalWon: 0,
      matches: [],
    };

    try {
      // Save locally to IndexedDB
      await localDB.saveTicket(newTicket);
      // Callback to applet state & socket
      onPurchaseSuccess(newTicket);
      sound.playNumberAnnounce(1);
    } catch (err) {
      console.error(err);
      setErrorMessage('Có lỗi xảy ra khi tạo vé. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Game Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(Object.keys(LOTTERY_GAMES) as GameId[]).map((gid) => {
          const g = LOTTERY_GAMES[gid];
          const isSelected = selectedGameId === gid;
          return (
            <button
              key={gid}
              onClick={() => {
                sound.playClick();
                onSelectGame(gid);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-slate-900 border-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                  {g.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {formatCurrency(g.ticketPrice)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-1">{g.subtitle}</p>
              {isSelected && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />}
            </button>
          );
        })}
      </div>

      {/* Main Ticket Builder Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-5 backdrop-blur-md">
        {/* Header & Round Countdown info */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-amber-400">{game.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${game.colorScheme.badgeBg}`}>
                {game.pickCount} / {game.totalBalls} số
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{game.description}</p>
          </div>

          {/* Active Round Status Box */}
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Kỳ quay hiện tại</div>
              <div className="text-sm font-bold text-slate-200 font-mono">
                {activeRound ? activeRound.id : 'Đang tải...'}
              </div>
            </div>
            <div className="pl-3 border-l border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Trạng thái</div>
              <div className="text-xs font-bold font-mono">
                {isBettingOpen ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ĐANG MỞ BÁN
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    ĐÃ ĐÓNG CỔNG
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Board Tabs (A, B, C, D, E, F) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {boards.map((b) => {
              const isSelected = activeBoardId === b.id;
              const isFull = b.numbers.length === game.pickCount;
              return (
                <div key={b.id} className="relative flex items-center">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setActiveBoardId(b.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>Bảng {b.id}</span>
                    <span
                      className={`text-[10px] px-1.5 rounded font-mono ${
                        isFull
                          ? isSelected
                            ? 'bg-slate-950 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                          : isSelected
                          ? 'bg-slate-900/60 text-slate-300'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {b.numbers.length}/{game.pickCount}
                    </span>
                  </button>

                  {boards.length > 1 && (
                    <button
                      onClick={() => handleRemoveBoard(b.id)}
                      className="ml-1 p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Xóa bảng này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {boards.length < 6 && (
              <button
                onClick={handleAddBoard}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-dashed border-amber-500/40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm bảng
              </button>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => handleQuickPickBoard(activeBoardId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-colors font-medium"
            >
              <Dices className="w-3.5 h-3.5" />
              Chọn nhanh bảng {activeBoardId}
            </button>

            <button
              onClick={handleQuickPickAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 transition-colors font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Chọn nhanh tất cả
            </button>

            <button
              onClick={() => handleClearBoard(activeBoardId)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              title="Xóa số bảng hiện tại"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa
            </button>

            <button
              onClick={handleSaveFavorite}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Lưu vào danh sách bộ số yêu thích"
            >
              {isFavoriteSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Lưu</span>
            </button>

            {lastTicket && lastTicket.gameId === selectedGameId && (
              <button
                onClick={handleCopyLastTicket}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Sao chép các số từ vé đã mua gần nhất"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>Vé cũ</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Numbers Summary Display */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Bộ số bảng {activeBoardId}:</span>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: game.pickCount }).map((_, i) => {
                const num = currentBoard.numbers[i];
                return (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm font-mono border shadow-sm transition-all ${
                      num !== undefined
                        ? 'bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 border-amber-300 shadow-amber-500/20 scale-105'
                        : 'bg-slate-900 border-dashed border-slate-700 text-slate-600'
                    }`}
                  >
                    {num !== undefined ? formatNumber(num) : '?'}
                  </div>
                );
              })}

              {/* Special number pill for 6/55 */}
              {game.hasSpecialBall && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-800">
                  <span className="text-[11px] text-amber-400 font-medium">Bóng ĐB:</span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm font-mono border shadow-sm ${
                      currentBoard.specialNumber !== undefined
                        ? 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white border-amber-300 shadow-rose-500/30'
                        : 'bg-slate-900 border-dashed border-slate-700 text-slate-600'
                    }`}
                  >
                    {currentBoard.specialNumber !== undefined
                      ? formatNumber(currentBoard.specialNumber)
                      : '+'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Fill Status */}
          <span className="text-xs text-slate-400">
            {currentBoard.numbers.length < game.pickCount
              ? `Vui lòng chọn thêm ${game.pickCount - currentBoard.numbers.length} số`
              : 'Đã hoàn thành bộ số này'}
          </span>
        </div>

        {/* Number Selection Matrix Grid */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Bảng chọn số (Nhấp chuột để chọn / bỏ chọn):
            </span>
            <span className="text-xs text-slate-500">
              Phạm vi: {game.minNumber} đến {game.maxNumber}
            </span>
          </div>

          {/* Digits 3D / 2D Picker */}
          {selectedGameId === 'digits3d' || selectedGameId === 'digits2d' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              {Array.from({ length: game.pickCount }).map((_, digitIdx) => (
                <div key={digitIdx} className="space-y-2">
                  <div className="text-xs font-bold text-amber-400 text-center">
                    Chữ số hàng {digitIdx === 0 ? 'Trăm (Đầu)' : digitIdx === 1 ? 'Chục (Giữa)' : 'Đơn vị (Cuối)'}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 10 }).map((_, d) => {
                      const isSelected = currentBoard.numbers[digitIdx] === d;
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            sound.playClick();
                            const currentNums = [...(currentBoard.numbers || [])];
                            currentNums[digitIdx] = d;
                            setBoards((prev) =>
                              prev.map((b) => (b.id === activeBoardId ? { ...b, numbers: currentNums } : b))
                            );
                          }}
                          className={`h-10 rounded-lg font-bold text-sm font-mono border transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black scale-105'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Matrix Lotteries (6/45, 6/55, 5/35) Grid */
            <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-10 lg:grid-cols-15 gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-slate-950 border border-slate-800">
              {Array.from({ length: game.totalBalls }).map((_, i) => {
                const num = i + 1;
                const isSelected = currentBoard.numbers.includes(num);
                const isSpecial = currentBoard.specialNumber === num;

                return (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (game.hasSpecialBall) handleSpecialNumberClick(num);
                    }}
                    className={`h-10 sm:h-11 rounded-xl font-bold text-xs sm:text-sm font-mono border transition-all flex items-center justify-center relative ${
                      isSelected
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 font-black scale-105 z-10'
                        : isSpecial
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md font-black'
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {formatNumber(num)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Saved Favorites Drawer (if any) */}
        {savedFavorites.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              Bộ số may mắn đã lưu của bạn:
            </div>
            <div className="flex flex-wrap gap-2">
              {savedFavorites.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => handleLoadFavorite(fav.numbers, fav.specialNumber)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-amber-300 font-mono flex items-center gap-1.5 group transition-colors"
                >
                  <span>{fav.numbers.map((n) => formatNumber(n)).join(' - ')}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300">
                    (Áp dụng)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Purchase Footer Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-400">
              Tổng số bảng: <strong className="text-slate-200">{boards.length} bảng</strong> (
              {boards.map((b) => b.id).join(', ')})
            </div>
            <div className="text-sm font-semibold text-slate-300">
              Thành tiền:{' '}
              <span className="text-lg font-black text-amber-400 font-mono">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToStudio}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-semibold transition-colors"
            >
              Xem trực tiếp 3D
            </button>

            <button
              onClick={handleBuyTicket}
              disabled={isSubmitting || !isBettingOpen}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                !isBettingOpen
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : isSubmitting
                  ? 'bg-amber-600 text-slate-950 opacity-70 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 shadow-amber-500/25 active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN MUA VÉ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
