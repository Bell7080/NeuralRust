// ================================================================
//  StoryManager.js
//  경로: Games/Codes/Managers/StoryManager.js
//
//  역할: 스토리 흐름 제어 — NEURAL RUST
//  의존: SaveManager
// ================================================================

const STORY_DATA = {

  1: [
    {
      id:    'day1_intro',
      phase: 'start',
      once:  true,
    },
  ],

  2: [
    {
      id:    'day2_start',
      phase: 'start',
      once:  true,
    },
  ],

  // 이후 Day는 시나리오.md 작업 후 여기에 추가
};

const DAY_CLEAR_CONDITIONS = {};

const TOTAL_DAYS = 50;

const StoryManager = {

  getScenesForToday(phaseFilter) {
    const { day } = SaveManager.getProgress();
    const dayScenes = STORY_DATA[day] || [];
    return dayScenes.filter(scene => {
      if (phaseFilter && scene.phase !== phaseFilter) return false;
      if (scene.once !== false && SaveManager.getFlag(scene.id + '_seen')) return false;
      if (scene.condition && !scene.condition()) return false;
      return true;
    }).map(s => s.id);
  },

  shouldPlay(sceneId) {
    const { day } = SaveManager.getProgress();
    const dayScenes = STORY_DATA[day] || [];
    const scene = dayScenes.find(s => s.id === sceneId);
    if (!scene) return false;
    if (scene.once !== false && SaveManager.getFlag(sceneId + '_seen')) return false;
    if (scene.condition && !scene.condition()) return false;
    return true;
  },

  completeScene(sceneId) {
    SaveManager.setFlag(sceneId + '_seen', true);
    SaveManager.addLog(sceneId);
    const { day } = SaveManager.getProgress();
    const dayScenes = STORY_DATA[day] || [];
    const scene = dayScenes.find(s => s.id === sceneId);
    if (scene?.onComplete) scene.onComplete();
  },

  canAdvance() {
    const { day } = SaveManager.getProgress();
    if (day >= TOTAL_DAYS) return false;
    const condition = DAY_CLEAR_CONDITIONS[day];
    return condition ? condition() : true;
  },

  advance() {
    if (!this.canAdvance()) return false;
    const { day } = SaveManager.getProgress();
    SaveManager.setFlag(`day${day}_cleared`, true);
    SaveManager.addLog(`day${day}_clear`);
    SaveManager.setProgress(day + 1, 'start');
    return true;
  },

  getDay()   { return SaveManager.getProgress().day;   },
  getPhase() { return SaveManager.getProgress().phase; },

  setPhase(phase) {
    const { day } = SaveManager.getProgress();
    SaveManager.setProgress(day, phase);
  },

  isEnding() {
    return SaveManager.getProgress().day > TOTAL_DAYS;
  },

  debug() {
    const story = SaveManager.loadStory();
    console.group('[StoryManager] 현재 상태');
    console.log('Day:', story.progress.day, '/ Phase:', story.progress.phase);
    console.log('Flags:', story.flags);
    console.log('Log:', story.log);
    console.log('Lore(unlocked):', story.unlockedLore);
    console.groupEnd();
  },
};
