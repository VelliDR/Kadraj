// src/core/historyManager.ts
import type { ProjectSnapshot } from '../types';

export class HistoryManager {
  private undoStack: ProjectSnapshot[] = [];
  private redoStack: ProjectSnapshot[] = [];
  private maxHistorySize = 30;
  private onChangeCallback: ((canUndo: boolean, canRedo: boolean) => void) | null = null;
  private isApplyingHistory = false;

  constructor(onChange?: (canUndo: boolean, canRedo: boolean) => void) {
    this.onChangeCallback = onChange || null;
  }

  public setOnChange(cb: (canUndo: boolean, canRedo: boolean) => void): void {
    this.onChangeCallback = cb;
  }

  public get isRestoring(): boolean {
    return this.isApplyingHistory;
  }

  /**
   * Yeni bir durumu geçmişe ekler.
   */
  public push(snapshot: ProjectSnapshot): void {
    if (this.isApplyingHistory) return;

    // Derin kopya alarak referans karışıklığını önle
    const cloned = JSON.parse(JSON.stringify(snapshot)) as ProjectSnapshot;

    // Aynı durumu art arda ekleme
    if (this.undoStack.length > 0) {
      const last = this.undoStack[this.undoStack.length - 1];
      if (JSON.stringify(last) === JSON.stringify(cloned)) {
        return;
      }
    }

    this.undoStack.push(cloned);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // Yeni işlem yapıldığında redo geçmişi temizlenir
    this.redoStack = [];
    this.notify();
  }

  /**
   * Bir adım geri alır.
   */
  public undo(currentSnapshot: ProjectSnapshot): ProjectSnapshot | null {
    if (this.undoStack.length === 0) return null;

    this.isApplyingHistory = true;
    try {
      const previous = this.undoStack.pop()!;
      // Mevcut durumu redo yığınına koy
      this.redoStack.push(JSON.parse(JSON.stringify(currentSnapshot)) as ProjectSnapshot);
      this.notify();
      return previous;
    } finally {
      this.isApplyingHistory = false;
    }
  }

  /**
   * Bir adım ileri alır.
   */
  public redo(currentSnapshot: ProjectSnapshot): ProjectSnapshot | null {
    if (this.redoStack.length === 0) return null;

    this.isApplyingHistory = true;
    try {
      const next = this.redoStack.pop()!;
      // Mevcut durumu undo yığınına koy
      this.undoStack.push(JSON.parse(JSON.stringify(currentSnapshot)) as ProjectSnapshot);
      this.notify();
      return next;
    } finally {
      this.isApplyingHistory = false;
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback(this.canUndo(), this.canRedo());
    }
  }
}
