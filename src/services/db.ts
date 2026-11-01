/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LotteryTicket, WalletTransaction, UserWallet, UserAchievementProgress } from '../types/lottery';

const DB_NAME = 'norat_lottery_3d_db';
const DB_VERSION = 1;

interface FavoriteSet {
  id: string;
  gameId: string;
  name: string;
  numbers: number[];
  specialNumber?: number;
  createdAt: number;
}

class LocalDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB not supported in this environment'));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('tickets')) {
            const ticketStore = db.createObjectStore('tickets', { keyPath: 'id' });
            ticketStore.createIndex('roundId', 'roundId', { unique: false });
            ticketStore.createIndex('gameId', 'gameId', { unique: false });
            ticketStore.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains('transactions')) {
            db.createObjectStore('transactions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('favorites')) {
            db.createObjectStore('favorites', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  // Tickets
  async saveTicket(ticket: LotteryTicket): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('tickets', 'readwrite');
      tx.objectStore('tickets').put(ticket);
    } catch {
      // Local fallback
      const tickets = this.getFallback<LotteryTicket[]>('tickets', []);
      const idx = tickets.findIndex((t) => t.id === ticket.id);
      if (idx >= 0) tickets[idx] = ticket;
      else tickets.unshift(ticket);
      this.setFallback('tickets', tickets);
    }
  }

  async getAllTickets(): Promise<LotteryTicket[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('tickets', 'readonly');
        const req = tx.objectStore('tickets').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.getFallback<LotteryTicket[]>('tickets', []);
    }
  }

  // Transactions
  async saveTransaction(t: WalletTransaction): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('transactions', 'readwrite');
      tx.objectStore('transactions').put(t);
    } catch {
      const list = this.getFallback<WalletTransaction[]>('transactions', []);
      list.unshift(t);
      this.setFallback('transactions', list.slice(0, 200));
    }
  }

  async getAllTransactions(): Promise<WalletTransaction[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('transactions', 'readonly');
        const req = tx.objectStore('transactions').getAll();
        req.onsuccess = () => {
          const res = (req.result || []) as WalletTransaction[];
          res.sort((a, b) => b.timestamp - a.timestamp);
          resolve(res);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.getFallback<WalletTransaction[]>('transactions', []);
    }
  }

  // Favorites
  async saveFavorite(fav: FavoriteSet): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('favorites', 'readwrite');
      tx.objectStore('favorites').put(fav);
    } catch {
      const favs = this.getFallback<FavoriteSet[]>('favorites', []);
      favs.unshift(fav);
      this.setFallback('favorites', favs);
    }
  }

  async getFavorites(gameId?: string): Promise<FavoriteSet[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('favorites', 'readonly');
        const req = tx.objectStore('favorites').getAll();
        req.onsuccess = () => {
          let list = (req.result || []) as FavoriteSet[];
          if (gameId) list = list.filter((f) => f.gameId === gameId);
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const favs = this.getFallback<FavoriteSet[]>('favorites', []);
      return gameId ? favs.filter((f) => f.gameId === gameId) : favs;
    }
  }

  async deleteFavorite(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('favorites', 'readwrite');
      tx.objectStore('favorites').delete(id);
    } catch {
      let favs = this.getFallback<FavoriteSet[]>('favorites', []);
      favs = favs.filter((f) => f.id !== id);
      this.setFallback('favorites', favs);
    }
  }

  // Export full game state to JSON file
  async exportFullBackup(): Promise<string> {
    const tickets = await this.getAllTickets();
    const transactions = await this.getAllTransactions();
    const favorites = await this.getFavorites();
    const wallet = this.getFallback<UserWallet | null>('user_wallet', null);
    const achievements = this.getFallback<UserAchievementProgress | null>('user_achievements', null);

    const backupData = {
      version: 1,
      appName: 'NORAT LOTTERY 3D',
      exportedAt: new Date().toISOString(),
      wallet,
      achievements,
      tickets,
      transactions,
      favorites,
    };

    return JSON.stringify(backupData, null, 2);
  }

  // Import game state from JSON file
  async importFullBackup(jsonContent: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.appName !== 'NORAT LOTTERY 3D') {
        throw new Error('Dữ liệu sao lưu không đúng định dạng NORAT LOTTERY 3D');
      }

      if (parsed.tickets && Array.isArray(parsed.tickets)) {
        for (const t of parsed.tickets) {
          await this.saveTicket(t);
        }
      }

      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        for (const tr of parsed.transactions) {
          await this.saveTransaction(tr);
        }
      }

      if (parsed.favorites && Array.isArray(parsed.favorites)) {
        for (const fav of parsed.favorites) {
          await this.saveFavorite(fav);
        }
      }

      if (parsed.wallet) {
        this.setFallback('user_wallet', parsed.wallet);
      }

      if (parsed.achievements) {
        this.setFallback('user_achievements', parsed.achievements);
      }

      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }

  // Fallback helpers with LocalStorage
  private getFallback<T>(key: string, defaultValue: T): T {
    try {
      const val = localStorage.getItem(`norat_${key}`);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setFallback<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`norat_${key}`, JSON.stringify(value));
    } catch {
      // Storage quota or private mode
    }
  }
}

export const localDB = new LocalDB();
