// ================================================================
//  Tab_Stubs.js
//  경로: Games/Codes/Scenes/Atelier/tabs/Tab_Stubs.js
//
//  역할: 아직 구현되지 않은 탭들의 플레이스홀더
// ================================================================

function makeStubTab(scene, W, H, title) {
  const cx = W / 2;
  const cy = H * 0.52;
  const panelW = W * 0.60;
  const panelH = H * 0.55;

  const container = scene.add.container(0, 0);

  const panel = scene.add.graphics();
  panel.fillStyle(0x120d07, 0.95);
  panel.lineStyle(1, 0x3a2210, 0.8);
  panel.strokeRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);
  panel.fillRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH);

  const label = scene.add.text(cx, cy - panelH / 2 + 20, `[ ${title} ]`, {
    fontSize:   scaledFontSize(15, scene.scale),
    fill:       '#7a5028',
    fontFamily: FontManager.MONO,
  }).setOrigin(0.5, 0);

  const msg = scene.add.text(cx, cy, '— 개발 중 —', {
    fontSize:   scaledFontSize(14, scene.scale),
    fill:       '#4a3018',
    fontFamily: FontManager.MONO,
  }).setOrigin(0.5);

  container.add([panel, label, msg]);

  return {
    _container: container,
    show()    { container.setVisible(true);  },
    hide()    { container.setVisible(false); },
    destroy() { container.destroy(); },
  };
}

class Tab_Recruit {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '영  입'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Facility {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '시  설'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Outsource {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '외  주'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Dredge {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '드 레 지'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Storage {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '창  고'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Codex {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '도  감'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Memory {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '회  상'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}

class Tab_Shop {
  constructor(scene, W, H) { this._tab = makeStubTab(scene, W, H, '상  점'); }
  get _container() { return this._tab._container || null; }
  show()    { this._tab.show();    }
  hide()    { this._tab.hide();    }
  destroy() { this._tab.destroy(); }
}
