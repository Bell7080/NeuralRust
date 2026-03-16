// ================================================================
//  Dive_Panel_Shop.js
//  경로: Games/Codes/Scenes/Dives/Panels/Dive_Panel_Shop.js
//
//  역할: 심해 상점 패널
//    - 심해화폐로 아이템 / 증강 구매
//    - 소모품 구매 → DiveInventoryAddItem() → 인벤토리 탭
//    - 증강 구매   → DiveStowageAddAugment() → 적재 탭 대기 영역
//    - 구매 후 상점 목록 갱신 (해당 항목 sold out)
//
//  상점 데이터 (scene._shopItems):
//    탐사 진입 시 1회 랜덤 생성, 라운드 내 유지
//    재고: 소모품 3개 + 증강 2개 고정 슬롯
//
//  TODO: 실제 아이템/증강 데이터 연동 (Data_Items.js 등)
//        현재는 더미 데이터로 구조만 구현
// ================================================================

// ── 더미 상점 데이터 ──────────────────────────────────────────────
const SHOP_DUMMY_CONSUMABLES = [
  { id: 'potion_hp',    name: '회복 포션',   desc: 'HP를 30 회복한다.',          color: '#c03060', price: 2, type: 'consumable' },
  { id: 'potion_gauge', name: '게이지 주사', desc: '전투 게이지를 100 충전한다.', color: '#3060c0', price: 3, type: 'consumable' },
  { id: 'ration',       name: '건조식량',    desc: '탐사 라운드를 1 연장한다.',   color: '#806030', price: 4, type: 'consumable' },
];
const SHOP_DUMMY_AUGMENTS = [
  {
    id: 'aug_pressure', name: '수압 강화',
    desc: '아군 전체 공격력 +10%',
    color: '#3090a0',
    shape: [[1,1,0],[0,1,1]],
    price: 5, type: 'augment',
  },
  {
    id: 'aug_shell', name: '철각 외장',
    desc: '아군 전체 피격 데미지 -8%',
    color: '#806040',
    shape: [[1,0],[1,1],[0,1]],
    price: 6, type: 'augment',
  },
];

// ── 상점 초기화 ──────────────────────────────────────────────────
function _diveInitShop(scene) {
  if (scene._shopItems) return;  // 이미 초기화됨 (라운드 내 유지)
  scene._shopItems = [
    ...SHOP_DUMMY_CONSUMABLES.map(i => ({ ...i, sold: false })),
    ...SHOP_DUMMY_AUGMENTS.map(i => ({ ...i, sold: false })),
  ];
}

// ── 패널 렌더 ────────────────────────────────────────────────────
function DivePanelShop(scene, px, py, pw, ph, fs) {
  _diveInitShop(scene);

  // 타이틀
  const title = scene.add.text(px, py, '심  해  상  점', {
    fontSize: fs(12), fill: '#4a2a10', fontFamily: FontManager.TITLE,
  });
  scene._tabContentContainer.add(title);

  const coinTxt = scene.add.text(px + pw - 4, py, `보유 심해화폐  ◈ ${scene._deepCoin}`, {
    fontSize: fs(10), fill: '#4a8ac0', fontFamily: FontManager.MONO,
  }).setOrigin(1, 0);
  scene._tabContentContainer.add(coinTxt);

  // 구분선
  const lg = scene.add.graphics();
  lg.lineStyle(1, 0x2a1a0a, 0.6);
  lg.lineBetween(px, py + parseInt(fs(18)), px + pw, py + parseInt(fs(18)));
  scene._tabContentContainer.add(lg);

  // 섹션 라벨
  const lblConsume = scene.add.text(px, py + parseInt(fs(22)), '▸ 소모품', {
    fontSize: fs(9), fill: '#3a2010', fontFamily: FontManager.MONO,
  });
  scene._tabContentContainer.add(lblConsume);

  const lblAug = scene.add.text(px + pw * 0.52, py + parseInt(fs(22)), '▸ 증강', {
    fontSize: fs(9), fill: '#3a2010', fontFamily: FontManager.MONO,
  });
  scene._tabContentContainer.add(lblAug);

  // 아이템 카드 렌더
  const itemH    = Math.round((ph - parseInt(fs(34))) / 3);
  const colW     = pw * 0.48;
  let   consRow  = 0;
  let   augRow   = 0;

  scene._shopItems.forEach(item => {
    const isConsume = item.type === 'consumable';
    const row       = isConsume ? consRow++ : augRow++;
    const colX      = isConsume ? px : px + pw * 0.52;
    const cardY     = py + parseInt(fs(34)) + row * (itemH + 4);

    _diveRenderShopCard(scene, item, colX, cardY, colW, itemH - 4, fs, () => {
      _divePurchaseItem(scene, item, coinTxt, fs);
    });
  });
}

function _diveRenderShopCard(scene, item, cx, cy, cw, ch, fs, onBuy) {
  const sold    = item.sold;
  const canAfford = scene._deepCoin >= item.price;

  const bg = scene.add.graphics();
  bg.fillStyle(sold ? 0x0a0806 : 0x0e0c08, 1);
  bg.lineStyle(1, sold ? 0x1a1008 : (canAfford ? 0x4a3818 : 0x1a1008), sold ? 0.3 : 0.8);
  bg.fillRect(cx, cy, cw, ch);
  bg.strokeRect(cx, cy, cw, ch);
  scene._tabContentContainer.add(bg);

  if (sold) {
    const soldTxt = scene.add.text(cx + cw / 2, cy + ch / 2, 'SOLD', {
      fontSize: fs(11), fill: '#3a2010', fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
    scene._tabContentContainer.add(soldTxt);
    return;
  }

  // 색상 아이콘
  const iconGfx = scene.add.graphics();
  iconGfx.fillStyle(Phaser.Display.Color.HexStringToColor(item.color || '#808080').color, 0.7);
  iconGfx.fillCircle(cx + ch * 0.5, cy + ch / 2, ch * 0.28);
  scene._tabContentContainer.add(iconGfx);

  // 이름 + 설명
  const nameTxt = scene.add.text(cx + ch + 4, cy + 3, item.name, {
    fontSize: fs(10), fill: '#c8a070', fontFamily: FontManager.TITLE,
  });
  scene._tabContentContainer.add(nameTxt);

  const descTxt = scene.add.text(cx + ch + 4, cy + 3 + parseInt(fs(13)), item.desc, {
    fontSize: fs(8), fill: '#6a5040', fontFamily: FontManager.MONO,
    wordWrap: { width: cw - ch - 8 - 40 },
  });
  scene._tabContentContainer.add(descTxt);

  // 가격 + 구매 버튼
  const btnW = 36, btnH = ch - 8;
  const btnX = cx + cw - btnW - 4;
  const btnY = cy + 4;

  const btnBg = scene.add.graphics();
  const drawBtn = (hover) => {
    btnBg.clear();
    if (!canAfford) {
      btnBg.fillStyle(0x0a0806,1); btnBg.lineStyle(1,0x1a1008,0.3);
    } else if (hover) {
      btnBg.fillStyle(0x2a1a08,1); btnBg.lineStyle(1,0xc8a070,1);
    } else {
      btnBg.fillStyle(0x1a1008,1); btnBg.lineStyle(1,0xa05018,0.8);
    }
    btnBg.fillRect(btnX, btnY, btnW, btnH);
    btnBg.strokeRect(btnX, btnY, btnW, btnH);
  };
  drawBtn(false);
  scene._tabContentContainer.add(btnBg);

  const priceTxt = scene.add.text(btnX + btnW / 2, btnY + btnH / 2,
    `◈${item.price}`, {
      fontSize: fs(9), fill: canAfford ? '#c8a070' : '#2a1a08',
      fontFamily: FontManager.MONO,
    }).setOrigin(0.5);
  scene._tabContentContainer.add(priceTxt);

  if (canAfford) {
    const hit = scene.add.rectangle(btnX + btnW/2, btnY + btnH/2, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(7);
    scene._tabContentContainer.add(hit);
    hit.on('pointerover', () => drawBtn(true));
    hit.on('pointerout',  () => drawBtn(false));
    hit.on('pointerdown', () => {
      hit.disableInteractive();
      onBuy();
    });
  }
}

function _divePurchaseItem(scene, item, coinTxt, fs) {
  if (scene._deepCoin < item.price) return;

  scene._deepCoin -= item.price;
  item.sold = true;

  // 심해화폐 UI 갱신
  if (scene._deepCoinTxt) scene._deepCoinTxt.setText(`${scene._deepCoin}`);
  coinTxt.setText(`보유 심해화폐  ◈ ${scene._deepCoin}`);

  // 아이템 분배
  if (item.type === 'consumable') {
    DiveInventoryAddItem(scene, { ...item });
  } else if (item.type === 'augment') {
    DiveSubmarineAddAugment(scene, { ...item });
  }

  // 상점 갱신
  DiveSwitchTab(scene, 'shop');
}
