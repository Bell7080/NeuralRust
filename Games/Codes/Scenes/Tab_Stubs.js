// ================================================================
//  Tab_Stubs.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Stubs.js
//
//  역할: 아직 구현되지 않은 탭들의 플레이스홀더
//  목록: Tab_Recruit / Tab_Squad / Tab_Facility /
//        Tab_Outsource / Tab_Dredge /
//        Tab_Storage / Tab_Codex / Tab_Memory
// ================================================================

/** 탭 플레이스홀더를 간단하게 만드는 팩토리 */
function makeStubTab(scene, W, H, title) {
  const cx = W / 2;
  const cy = H * 0.52;
  const panelW = W * 0.60;
  const panelH = H * 0.55;

  const container = scene.add.container(0, 0);

  const panel = scene.add.graphics();
  panel.fillStyle(0x0a0705, 0.9);
  panel.lineStyle(1, 0x2a1a0a, 0.7);
  panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
  panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

  const label = scene.add.text(cx, cy - panelH / 2 + 20, `[ ${title} ]`, {
    fontSize:   scaledFontSize(14, scene.scale),
    fill:       '#3d2010',
    fontFamily: FontManager.MONO,
  }).setOrigin(0.5, 0);

  const msg = scene.add.text(cx, cy, '— 개발 중 —', {
    fontSize:   scaledFontSize(13, scene.scale),
    fill:       '#1e1008',
    fontFamily: FontManager.MONO,
  }).setOrigin(0.5);

  container.add([panel, label, msg]);

  return {
    show()    { container.setVisible(true);  },
    hide()    { container.setVisible(false); },
    destroy() { container.destroy(); },
  };
}

// ── 각 탭 클래스 ─────────────────────────────────────────────────

class Tab_Recruit {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '영  입'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Squad {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '탐 사 대'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Facility {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '시  설'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Outsource {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '외  주'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Dredge {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '드 레 지'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Storage {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '창  고'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Codex {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '도  감'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Memory {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '회  상'); }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}
