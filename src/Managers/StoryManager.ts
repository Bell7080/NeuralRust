// ================================================================
//  StoryManager.ts
//  경로: src/Managers/StoryManager.ts
//
//  역할: 스토리 흐름 제어 — NEURAL RUST
//  의존: SaveManager
// ================================================================

import { SaveManager } from './SaveManager';

interface StoryScene {
  id:         string;
  phase:      string;
  once?:      boolean;
  condition?: () => boolean;
  onComplete?: () => void;
}

const STORY_DATA: Record<number, StoryScene[]> = {
  1: [
    { id: 'Welcome',   phase: 'start', once: true },
  ],
  2: [
    { id: 'day2_start', phase: 'start', once: true },
  ],
  // 이후 Day는 시나리오 작업 후 여기에 추가
};

const DAY_CLEAR_CONDITIONS: Record<number, () => boolean> = {};

const TOTAL_DAYS = 50;

export const StoryManager = {

  getScenesForToday(phaseFilter?: string): string[] {
    const { day } = SaveManager.getProgress();
    const dayScenes = STORY_DATA[day] || [];
    return dayScenes.filter(scene => {
      if (phaseFilter && scene.phase !== phaseFilter) return false;
      if (scene.once !== false && SaveManager.getFlag(scene.id + '_seen')) return false;
      if (scene.condition && !scene.condition()) return false;
      return true;
    }).map(s => s.id);
  },

  shouldPlay(sceneId: string): boolean {
    const { day } = SaveManager.getProgress();
    const dayScenes = STORY_DATA[day] || [];
    const scene = dayScenes.find(s => s.id === sceneId);
    if (!scene) return false;
    if (scene.once !== false && SaveManager.getFlag(sceneId + '_seen')) return false;
    if (scene.condition && !scene.condition()) return false;
    return true;
  },

  completeScene(sceneId: string): void {
    SaveManager.setFlag(sceneId + '_seen', true);
    SaveManager.addLog(sceneId);
    const { day } = SaveManager.getProgress();
    const dayScenes = STORY_DATA[day] || [];
    const scene = dayScenes.find(s => s.id === sceneId);
    if (scene?.onComplete) scene.onComplete();
  },

  canAdvance(): boolean {
    const { day } = SaveManager.getProgress();
    if (day >= TOTAL_DAYS) return false;
    const condition = DAY_CLEAR_CONDITIONS[day];
    return condition ? condition() : true;
  },

  advance(): boolean {
    if (!this.canAdvance()) return false;
    const { day } = SaveManager.getProgress();
    SaveManager.setFlag(`day${day}_cleared`, true);
    SaveManager.addLog(`day${day}_clear`);
    SaveManager.setProgress(day + 1, 'start');
    return true;
  },

  getDay():   number { return SaveManager.getProgress().day;   },
  getPhase(): string { return SaveManager.getProgress().phase; },

  setPhase(phase: string): void {
    const { day } = SaveManager.getProgress();
    SaveManager.setProgress(day, phase);
  },

  isEnding(): boolean {
    return SaveManager.getProgress().day > TOTAL_DAYS;
  },

  debug(): void {
    const story = SaveManager.loadStory();
    console.group('[StoryManager] 현재 상태');
    console.log('Day:', story.progress.day, '/ Phase:', story.progress.phase);
    console.log('Flags:', story.flags);
    console.log('Log:', story.log);
    console.log('Lore(unlocked):', story.unlockedLore);
    console.groupEnd();
  },
};
