// ================================================================
//  DialogueScene.ts
//  경로: src/Dialogues/DialogueScene.ts
//
//  Phaser 레이어: 배경 이미지(크로스페이드), 캐릭터 일러스트, 카메라 FX
//  HTML 레이어:   #dialogue-hud (대화창, 이름창, 본문, 선택지)
// ================================================================

import './DialogueScene.css';
import {
  CAST_DATA, BGM_DATA, BG_DATA, SFX_DATA, DIALOGUE_DATA,
  type DialogueLine, type ChoiceEntry,
} from './DialogueData';
import { FontManager }  from '../Managers/FontManager';
import { AudioManager } from '../Managers/AudioManager';
import { SaveManager }  from '../Managers/SaveManager';
import { StoryManager } from '../Managers/StoryManager';

export class DialogueScene extends Phaser.Scene {
  constructor() { super({ key: 'DialogueScene' }); }

  // ── 씬 상태 ──────────────────────────────────────────────────
  private _eventId!:  string;
  private _next!:     string;
  private _nextData!: Record<string, unknown>;

  private _lines:   DialogueLine[] = [];
  private _lineMap: Record<string, number> = {};
  private _cursor   = 0;
  private _done     = false;
  private _typing   = false;
  private _inputLocked = false;
  private _pendingText = '';
  private _waitingForChoice = false;
  private _pendingChoices: ChoiceEntry[] | null = null;
  private _timers: Phaser.Time.TimerEvent[] = [];

  // ── Phaser 오브젝트 ──────────────────────────────────────────
  private W = 0;
  private H = 0;
  private _bgSpriteCur:  Phaser.GameObjects.Image | null = null;
  private _bgSpriteNext: Phaser.GameObjects.Image | null = null;
  private _bgOverlay!:   Phaser.GameObjects.Rectangle;
  private _bgFallback!:  Phaser.GameObjects.Graphics;
  private _bgGrid!:      Phaser.GameObjects.Graphics;
  private _bgCurrentKey: string | null = null;
  private _charSprite:   Phaser.GameObjects.Image | null = null;
  private _charH = 0;
  private _charX = 0;
  private _charY = 0;

  // ── HTML DOM 요소 ─────────────────────────────────────────────
  private _hudEl!:     HTMLElement;
  private _nameWrapEl!: HTMLElement;
  private _nameEl!:    HTMLElement;
  private _textEl!:    HTMLElement;
  private _nextIconEl!: HTMLElement;
  private _choicesEl!: HTMLElement;

  // ── 입력 핸들러 참조 (제거용) ─────────────────────────────────
  private _onAdvanceBound!: () => void;

  // ════════════════════════════════════════════════════════════
  //  생명주기
  // ════════════════════════════════════════════════════════════
  init(data: { eventId?: string; next?: string; nextData?: Record<string, unknown> }): void {
    this._eventId  = data.eventId  || '';
    this._next     = data.next     || 'AtelierScene';
    this._nextData = data.nextData || {};
  }

  preload(): void {
    // 텍스트박스 3종
    const boxes = ['textbox_001', 'textbox_002', 'textbox_003'];
    const files  = ['Textbox_001', 'Textbox_002', 'Textbox_003'];
    boxes.forEach((key, i) => {
      if (!this.textures.exists(key))
        this.load.image(key, `Games/Assets/Sprites/${files[i]}.png`);
    });

    const eventData = DIALOGUE_DATA[this._eventId];
    if (!eventData) return;

    // 배경 이미지
    const usedTags = new Set(
      eventData.lines.map(l => l.bg).filter(Boolean).map(b => {
        const colon = b!.indexOf(':');
        return colon > 0 ? b!.slice(colon + 1).trim() : b!.trim();
      })
    );
    usedTags.forEach(tag => {
      if (tag === 'NONE') return;
      const file = BG_DATA[tag];
      if (!file) return;
      const key = `bg_${file}`;
      if (!this.textures.exists(key))
        this.load.image(key, `Games/Assets/Sprites/${file}.png`);
    });

    // 캐릭터 일러스트
    const toLoad = new Set<string>();
    eventData.lines.forEach(line => {
      if (!line.char || line.char === 'P') return;
      const cast = CAST_DATA[line.char];
      if (!cast || cast.name === 'Player') return;
      const expr = line.expr ? String(line.expr).padStart(3, '0') : '001';
      toLoad.add(`Character_${cast.name}_${expr}`);
    });
    toLoad.forEach(key => {
      if (!this.textures.exists(key))
        this.load.image(key, `Games/Assets/Sprites/${key}.png`);
    });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;

    this._timers           = [];
    this._done             = false;
    this._typing           = false;
    this._inputLocked      = false;
    this._pendingText      = '';
    this._charSprite       = null;
    this._waitingForChoice = false;
    this._pendingChoices   = null;
    this._bgSpriteCur      = null;
    this._bgSpriteNext     = null;
    this._bgCurrentKey     = null;

    const eventData = DIALOGUE_DATA[this._eventId];
    if (!eventData || !eventData.lines.length) {
      console.warn('[DialogueScene] 이벤트 없음:', this._eventId);
      this._goNext();
      return;
    }

    this._lines   = eventData.lines;
    this._lineMap = eventData.lineMap || {};
    this._cursor  = 0;

    const bgmKey = BGM_DATA[this._eventId];
    if (bgmKey) AudioManager.playBGM(bgmKey);

    this._buildCanvas(W, H);
    this._buildHUD();

    // 오프닝 연출
    this.cameras.main.fadeIn(700, 0, 0, 0);

    this.time.delayedCall(800, () => {
      this._hudEl.classList.add('visible');
    });

    this.time.delayedCall(1400, () => {
      this._revealPortrait();
      this._buildInput();
      this._showLine();
    });
  }

  shutdown(): void {
    this._timers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._timers = [];
    this._removeInput();
    this._hudEl?.remove();
  }

  // ════════════════════════════════════════════════════════════
  //  Phaser 캔버스 레이어
  // ════════════════════════════════════════════════════════════
  private _buildCanvas(W: number, H: number): void {
    this._bgFallback = this.add.graphics().setDepth(0);
    this._bgFallback.fillStyle(0x080a0f, 1).fillRect(0, 0, W, H);

    this._bgGrid = this.add.graphics().setDepth(0);
    this._bgGrid.lineStyle(1, 0x0d1018, 0.6);
    const step = Math.round(W / 52);
    for (let x = 0; x <= W; x += step) this._bgGrid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += step) this._bgGrid.lineBetween(0, y, W, y);

    this._bgOverlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.40)
      .setOrigin(0).setDepth(1);

    // 첫 배경
    const firstBgTag = this._lines?.[0]?.bg;
    if (firstBgTag) {
      const texKey = this._resolveBgKey(firstBgTag);
      if (texKey && this.textures.exists(texKey)) {
        this._bgSpriteCur = this.add.image(W / 2, H / 2, texKey)
          .setDisplaySize(W, H).setDepth(0);
        this._bgGrid.setVisible(false);
        this._bgFallback.setVisible(false);
        this._bgCurrentKey = texKey;
      }
    }

    // 캐릭터 슬롯 계산 — CSS 대화창 기준 (bottom:3%, min-height:17vh)
    const dlgBottom = H * 0.03;
    const dlgMinH   = Math.max(H * 0.17, 130);
    const charFootY = Math.round(H - dlgBottom - dlgMinH);
    this._charH     = Math.round(charFootY * 0.91);
    this._charX     = Math.round(W / 2);
    this._charY     = charFootY - Math.round(this._charH / 2);
  }

  private _revealPortrait(): void {
    const line = this._lines?.[0];
    if (!line || !line.char || line.char === 'P') return;
    const cast = CAST_DATA[line.char];
    if (!cast || cast.name === 'Player') return;
    const exprStr = line.expr ? String(line.expr).padStart(3, '0') : '001';
    const texKey  = `Character_${cast.name}_${exprStr}`;
    if (!this.textures.exists(texKey)) return;

    this._charSprite = this.add.image(this._charX, this._charY, texKey).setDepth(5);
    const scale = this._charH / this._charSprite.height;
    this._charSprite.setScale(scale).setAlpha(0);
    this.tweens.add({ targets: this._charSprite, alpha: 1, duration: 800, ease: 'Linear' });
  }

  private _updatePortrait(charKey: string | null, expr: string | null): void {
    if (!charKey || charKey === 'P') {
      if (this._charSprite) {
        this.tweens.add({
          targets: this._charSprite, alpha: 0, duration: 200,
          onComplete: () => { this._charSprite?.setVisible(false); },
        });
      }
      return;
    }
    const cast = CAST_DATA[charKey];
    if (!cast || cast.name === 'Player') return;

    const exprStr = expr ? String(expr).padStart(3, '0') : '001';
    const texKey  = `Character_${cast.name}_${exprStr}`;
    if (!this.textures.exists(texKey)) return;

    if (!this._charSprite) {
      this._charSprite = this.add.image(this._charX, this._charY, texKey).setDepth(5);
      const scale = this._charH / this._charSprite.height;
      this._charSprite.setScale(scale).setAlpha(0);
      this.tweens.add({ targets: this._charSprite, alpha: 1, duration: 250 });
    } else {
      if (this._charSprite.texture.key !== texKey) {
        this._charSprite.setTexture(texKey).setVisible(true);
        const scale = this._charH / this._charSprite.height;
        this._charSprite.setScale(scale);
      }
    }
  }

  // ── 배경 전환 ─────────────────────────────────────────────────
  private _changeBg(bgTag: string, mode: string = 'crossfade'): void {
    const W = this.W, H = this.H;

    if (bgTag === 'NONE') {
      if (this._bgSpriteCur) {
        this.tweens.add({
          targets: this._bgSpriteCur, alpha: 0, duration: 400,
          onComplete: () => {
            this._bgSpriteCur?.setVisible(false);
            this._bgGrid.setVisible(true);
            this._bgFallback.setVisible(true);
            this._bgCurrentKey = null;
          },
        });
      }
      return;
    }

    const texKey = this._resolveBgKey(bgTag);
    if (!texKey || !this.textures.exists(texKey)) return;
    if (texKey === this._bgCurrentKey) return;

    const ensureSprite = (slot: '_bgSpriteCur' | '_bgSpriteNext') => {
      if (!this[slot]) {
        this[slot] = this.add.image(W / 2, H / 2, texKey)
          .setDisplaySize(W, H).setAlpha(0).setVisible(false).setDepth(0);
      }
      return this[slot]!;
    };

    if (mode === 'instant') {
      const spr = ensureSprite('_bgSpriteCur');
      spr.setTexture(texKey).setAlpha(1).setVisible(true);
      this._bgGrid.setVisible(false);
      this._bgFallback.setVisible(false);
      this._bgCurrentKey = texKey;
      return;
    }

    if (mode === 'fade_black') {
      this.tweens.add({
        targets: this._bgOverlay, alpha: 1, duration: 250,
        onComplete: () => {
          const spr = ensureSprite('_bgSpriteCur');
          spr.setTexture(texKey).setAlpha(1).setVisible(true);
          this._bgGrid.setVisible(false);
          this._bgFallback.setVisible(false);
          this._bgCurrentKey = texKey;
          this.tweens.add({ targets: this._bgOverlay, alpha: 0.55, duration: 300 });
        },
      });
      return;
    }

    // crossfade
    const next = ensureSprite('_bgSpriteNext');
    next.setTexture(texKey).setAlpha(0).setVisible(true);
    this.tweens.add({
      targets: next, alpha: 1, duration: 500, ease: 'Sine.easeInOut',
      onComplete: () => {
        this._bgSpriteCur?.setAlpha(0).setVisible(false);
        [this._bgSpriteCur, this._bgSpriteNext] = [next, this._bgSpriteCur];
        this._bgCurrentKey = texKey;
        this._bgGrid.setVisible(false);
        this._bgFallback.setVisible(false);
      },
    });
  }

  private _resolveBgKey(bgTag: string): string | null {
    if (!bgTag || bgTag === 'NONE') return null;
    const file = BG_DATA[bgTag];
    if (!file) return null;
    return `bg_${file}`;
  }

  // ── 카메라 FX ──────────────────────────────────────────────────
  private _playFx(fxStr: string): void {
    fxStr.split('|').forEach(part => {
      const [name, paramStr] = part.trim().split(':');
      const p: Record<string, number> = {};
      if (paramStr) paramStr.split(',').forEach(kv => {
        const [k, v] = kv.split('=');
        p[k.trim()] = Number(v);
      });
      switch (name.trim()) {
        case 'shake_screen': this.cameras.main.shake(p.duration || 300, (p.intensity || 3) / 1000); break;
        case 'flash_screen': this.cameras.main.flash(p.duration || 200, 255, 255, 255); break;
        case 'fade_out':     this.cameras.main.fadeOut(p.duration || 400, 0, 0, 0); break;
        case 'fade_in':      this.cameras.main.fadeIn(p.duration  || 400, 0, 0, 0); break;
        case 'zoom_in':      this.cameras.main.zoomTo(p.zoom || 1.2, p.duration || 300); break;
        case 'zoom_out':     this.cameras.main.zoomTo(p.zoom || 1.0, p.duration || 300); break;
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  //  HTML DOM 레이어
  // ════════════════════════════════════════════════════════════
  private _buildHUD(): void {
    // 기존 요소 제거
    document.getElementById('dialogue-hud')?.remove();

    const hud = document.createElement('div');
    hud.id = 'dialogue-hud';

    // 비네트 레이어
    const vignette = document.createElement('div');
    vignette.className = 'dlg-vignette';
    hud.appendChild(vignette);

    // 선택지 컨테이너 (박스보다 위 레이어에서 absolute 위치)
    const choices = document.createElement('div');
    choices.className = 'dlg-choices';

    // 대화창
    const box = document.createElement('div');
    box.className = 'dlg-box';

    // 이름창
    const nameWrap = document.createElement('div');
    nameWrap.className = 'dlg-name-wrap';
    nameWrap.style.display = 'none';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'dlg-name';
    nameWrap.appendChild(nameSpan);

    // 본문 텍스트
    const body = document.createElement('div');
    body.className = 'dlg-body';

    // 다음 아이콘
    const next = document.createElement('div');
    next.className = 'dlg-next';
    next.textContent = '▶';

    // 힌트
    const hint = document.createElement('div');
    hint.className = 'dlg-hint';
    hint.textContent = 'SPACE / CLICK';

    box.appendChild(nameWrap);
    box.appendChild(body);
    box.appendChild(next);
    box.appendChild(hint);

    hud.appendChild(choices);
    hud.appendChild(box);

    const container = document.getElementById('game-container');
    if (container) container.appendChild(hud);
    else document.body.appendChild(hud);

    this._hudEl      = hud;
    this._nameWrapEl = nameWrap;
    this._nameEl     = nameSpan;
    this._textEl     = body;
    this._nextIconEl = next;
    this._choicesEl  = choices;
  }

  // ════════════════════════════════════════════════════════════
  //  타이핑
  // ════════════════════════════════════════════════════════════
  private _typeText(fullText: string, onDone?: () => void): void {
    this._timers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._timers = [];
    this._typing      = true;
    this._pendingText = fullText;
    this._textEl.textContent = '';

    const chars = [...fullText];
    let i = 0;
    const tick = () => {
      if (!this.scene?.isActive()) return;
      if (i < chars.length) {
        this._textEl.textContent = chars.slice(0, ++i).join('');
        this._timers.push(this.time.delayedCall(28, tick));
      } else {
        this._typing = false;
        this._textEl.textContent = fullText;
        onDone?.();
      }
    };
    this._timers.push(this.time.delayedCall(28, tick));
  }

  private _skipType(): void {
    this._timers.forEach(t => { try { t.remove(); } catch (_) {} });
    this._timers = [];
    this._typing = false;
    this._textEl.textContent = this._pendingText;
    this._nextIconEl.classList.add('visible');
    this._inputLocked = true;
    this.time.delayedCall(100, () => { this._inputLocked = false; });
  }

  // ════════════════════════════════════════════════════════════
  //  선택지
  // ════════════════════════════════════════════════════════════
  private _showChoices(choices: ChoiceEntry[]): void {
    if (!choices || !choices.length) { this._cursor++; this._showLine(); return; }

    this._choicesEl.innerHTML = '';

    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'dlg-choice-btn';
      btn.textContent = choice.label;

      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();   // document.pointerdown(_onAdvance) 전파 차단
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._choicesEl.innerHTML = '';
        if (choice.gotoIdx != null) {
          this._cursor = choice.gotoIdx;
        } else if (choice.goto && this._lineMap[choice.goto] != null) {
          this._cursor = this._lineMap[choice.goto];
        } else {
          this._cursor++;
        }
        this._showLine();
      });

      this._choicesEl.appendChild(btn);

      // 페이드인
      this.time.delayedCall(i * 80 + 30, () => {
        btn.classList.add('ready');
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  //  라인 표시
  // ════════════════════════════════════════════════════════════
  private _showLine(): void {
    if (this._cursor >= this._lines.length) { this._finish(); return; }

    const line = this._lines[this._cursor];

    // 이름창
    const isPlayer = line.char === 'P';
    if (isPlayer || !line.char) {
      this._nameWrapEl.style.display = 'none';
    } else {
      this._nameWrapEl.style.display = '';
      this._nameEl.textContent = this._getDisplayName(line.char);
    }

    // 캐릭터 이미지
    this._updatePortrait(line.char, line.expr);

    // 배경 전환
    if (line.bg) {
      const colonIdx = line.bg.indexOf(':');
      if (colonIdx > 0) {
        this._changeBg(line.bg.slice(colonIdx + 1).trim(), line.bg.slice(0, colonIdx).trim());
      } else {
        this._changeBg(line.bg);
      }
    }

    // SFX
    if (line.sfx) {
      line.sfx.split('|').forEach(alias => {
        const f = SFX_DATA[alias.trim()];
        if (f) AudioManager.playSFX(f);
      });
    }

    // FX
    if (line.fx) this._playFx(line.fx);

    // 플래그
    if (line.flag_set) SaveManager.setFlag(line.flag_set, true);

    // 선택지 지우기
    this._choicesEl.innerHTML = '';
    this._nextIconEl.classList.remove('visible');

    if (line.isChoice) {
      this._pendingChoices   = line.choices || [];
      this._waitingForChoice = true;
      this._typeText(line.text, () => { this._nextIconEl.classList.add('visible'); });
    } else {
      this._typeText(line.text, () => { this._nextIconEl.classList.add('visible'); });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  입력
  // ════════════════════════════════════════════════════════════
  private _buildInput(): void {
    this._onAdvanceBound = this._onAdvance.bind(this);
    // DOM 이벤트로 처리 — Phaser input은 HTML DOM 레이어에 막혀 도달하지 못함
    document.addEventListener('pointerdown', this._onAdvanceBound as EventListener);
    this.input.keyboard!.on('keydown-SPACE', this._onAdvanceBound, this);
    this.input.keyboard!.on('keydown-ENTER', this._onAdvanceBound, this);
  }

  private _removeInput(): void {
    document.removeEventListener('pointerdown', this._onAdvanceBound as EventListener);
    this.input.keyboard?.off('keydown-SPACE', this._onAdvanceBound, this);
    this.input.keyboard?.off('keydown-ENTER', this._onAdvanceBound, this);
  }

  private _onAdvance(): void {
    if (this._done) return;
    const line = this._lines[this._cursor];
    if (line?.isChoice && !this._waitingForChoice) return;

    if (this._typing) { this._skipType(); return; }
    if (this._inputLocked) return;

    if (this._waitingForChoice) {
      this._waitingForChoice = false;
      this._nextIconEl.classList.remove('visible');
      const choices = this._pendingChoices!;
      this._pendingChoices = null;
      this._textEl.style.opacity = '0';
      this.time.delayedCall(250, () => {
        this._textEl.textContent = '';
        this._textEl.style.opacity = '';
        this._showChoices(choices);
      });
      return;
    }

    this._cursor++;
    this._showLine();
  }

  // ════════════════════════════════════════════════════════════
  //  완료
  // ════════════════════════════════════════════════════════════
  private _finish(): void {
    if (this._done) return;
    this._done = true;
    this._removeInput();
    StoryManager.completeScene(this._eventId);
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this._goNext());
  }

  private _goNext(): void {
    this.scene.start(this._next, this._nextData);
  }

  // ── 헬퍼 ─────────────────────────────────────────────────────
  private _getDisplayName(charKey: string): string {
    if (!charKey) return '';
    const runtime = SaveManager.getFlag(`cast_nick_${charKey}`);
    if (runtime && typeof runtime === 'string') return runtime;
    const cast = CAST_DATA[charKey];
    if (!cast) return charKey;
    return cast.nickname || cast.name || charKey;
  }
}
