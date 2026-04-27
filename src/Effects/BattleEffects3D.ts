// ================================================================
//  BattleEffects3D.ts
//  경로: src/Effects/BattleEffects3D.ts
//
//  역할: Three.js 기반 3D 전투 이펙트 오버레이
//        세계관: 스팀펑크 · 심해 · 잉크
//
//  이펙트 목록
//    spawnAllyAttack  — 청동 톱니바퀴 투사체 + 증기 궤적
//    spawnEnemyAttack — 잉크 방울 연속 발사
//    spawnDeathEffect — 톱니바퀴 붕괴 + 잉크 폭발
//
//  좌표계: Phaser (0,0 좌상단) → Three.js 로 변환하여 배치
// ================================================================

import * as THREE from 'three';

interface Effect { update(dt: number): boolean; }

export class BattleEffects3D {
  private _renderer: THREE.WebGLRenderer;
  private _scene:    THREE.Scene;
  private _camera:   THREE.OrthographicCamera;
  private _effects:  Effect[] = [];
  private _W: number;
  private _H: number;

  constructor(phaserCanvas: HTMLCanvasElement) {
    this._W = phaserCanvas.width;
    this._H = phaserCanvas.height;

    this._renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this._renderer.setSize(this._W, this._H);
    this._renderer.setClearColor(0x000000, 0);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const cvs = this._renderer.domElement;
    cvs.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9;';
    phaserCanvas.parentElement?.appendChild(cvs);

    // 표준 Three.js 오르소 카메라 (중앙 원점, Y-up)
    this._camera = new THREE.OrthographicCamera(
      -this._W * 0.5,  this._W * 0.5,
       this._H * 0.5, -this._H * 0.5,
      -500, 500,
    );
    this._camera.position.set(0, 0, 100);

    this._scene = new THREE.Scene();
    this._scene.add(new THREE.AmbientLight(0xffeedd, 0.6));
    const key = new THREE.DirectionalLight(0xffcc88, 2.2);
    key.position.set(0.6, -0.8, 1.5);
    this._scene.add(key);
    const fill = new THREE.DirectionalLight(0x2255aa, 0.8);
    fill.position.set(-1, 1, 0.5);
    this._scene.add(fill);
  }

  // ── Phaser 픽셀 → Three.js 월드 좌표 변환 ──────────────────
  // Phaser: (0,0) 좌상단, Y 아래증가
  // Three.js: (0,0) 중앙, Y 위증가
  private _px(x: number, y: number, z = 0): THREE.Vector3 {
    return new THREE.Vector3(x - this._W * 0.5, this._H * 0.5 - y, z);
  }

  // ── 톱니바퀴 Shape ────────────────────────────────────────────
  private _gearShape(teeth: number, r1: number, r2: number): THREE.Shape {
    const shape = new THREE.Shape();
    const n = teeth * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = i % 2 === 0 ? r2 : r1;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else         shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    const hole = new THREE.Path();
    const hr = r1 * 0.42;
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      if (i === 0) hole.moveTo(Math.cos(a) * hr, Math.sin(a) * hr);
      else         hole.lineTo(Math.cos(a) * hr, Math.sin(a) * hr);
    }
    shape.holes.push(hole);
    return shape;
  }

  private _makeGear(
    teeth: number, r1: number, r2: number, depth: number,
    color = 0xb87820, emissive = 0x3a1a00,
  ): THREE.Mesh {
    const geo = new THREE.ExtrudeGeometry(this._gearShape(teeth, r1, r2), {
      depth, bevelEnabled: true,
      bevelSize: r1 * 0.07, bevelThickness: r1 * 0.06, bevelSegments: 2,
    });
    const mat = new THREE.MeshStandardMaterial({
      color, metalness: 0.88, roughness: 0.20,
      emissive, emissiveIntensity: 0.45,
    });
    return new THREE.Mesh(geo, mat);
  }

  // ════════════════════════════════════════════════════════════
  //  아군 공격: 청동 톱니바퀴 투사체 + 증기 궤적
  // ════════════════════════════════════════════════════════════
  spawnAllyAttack(
    fromX: number, fromY: number,
    toX:   number, toY:   number,
    isCrit: boolean,
  ): void {
    const gear = this._makeGear(
      10, 14, 20, 7,
      isCrit ? 0xffd040 : 0xc89030,
      isCrit ? 0x904010 : 0x3a1a00,
    );
    if (isCrit) (gear.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
    const from = this._px(fromX, fromY);
    const to   = this._px(toX, toY);
    gear.position.copy(from);
    this._scene.add(gear);

    // 증기 궤적 (포인트 클라우드)
    const TRAIL = 16;
    const tPos  = new Float32Array(TRAIL * 3);
    const tGeo  = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    const tMat = new THREE.PointsMaterial({
      color: isCrit ? 0xffe880 : 0xb8dce8,
      size: isCrit ? 10 : 6, transparent: true, opacity: 0.75,
      sizeAttenuation: false,
    });
    const trail = new THREE.Points(tGeo, tMat);
    this._scene.add(trail);
    const history: [number, number, number][] = [];

    // 베지에 호 — 수직 방향으로 약간 꺾이게, Z는 포물선
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px  = -dy / len * 30, py = dx / len * 30;
    const mx  = (from.x + to.x) / 2 + px;
    const my  = (from.y + to.y) / 2 + py;
    const maxZ = isCrit ? 90 : 58;
    const dur = isCrit ? 0.27 : 0.34;
    let elapsed = 0;

    this._effects.push({
      update: (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / dur, 1);
        const t1 = 1 - t;

        const x = t1 * t1 * from.x + 2 * t1 * t * mx + t * t * to.x;
        const y = t1 * t1 * from.y + 2 * t1 * t * my + t * t * to.y;
        const z = 4 * t * t1 * maxZ;

        gear.position.set(x, y, z);
        gear.scale.setScalar(1 + (z / maxZ) * 0.4); // Z로 가까워질수록 크게
        gear.rotation.x += dt * (isCrit ? 17 : 10);
        gear.rotation.y += dt * (isCrit ? 12 : 7);
        gear.rotation.z += dt * (isCrit ? 15 : 9);

        // 궤적 갱신
        history.unshift([x, y, z]);
        if (history.length > TRAIL) history.pop();
        for (let i = 0; i < TRAIL; i++) {
          const p = history[i] ?? [x, y, z];
          tPos[i * 3] = p[0]; tPos[i * 3 + 1] = p[1]; tPos[i * 3 + 2] = p[2];
        }
        (tGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        tMat.opacity = 0.75 * (1 - t * 0.55);

        if (t >= 1) {
          gear.removeFromParent();
          trail.removeFromParent();
          (gear.geometry as THREE.BufferGeometry).dispose();
          (gear.material as THREE.Material).dispose();
          tGeo.dispose(); tMat.dispose();
          this._spawnImpact(toX, toY, isCrit);
          return false;
        }
        return true;
      },
    });
  }

  // ── 착탄 이펙트: 기어 파편 + 잉크 구름 ───────────────────────
  private _spawnImpact(cx: number, cy: number, isCrit: boolean): void {
    const N = isCrit ? 7 : 4;
    const center = this._px(cx, cy);

    const frags: {
      mesh: THREE.Mesh; geo: THREE.BufferGeometry; mat: THREE.Material;
      vx: number; vy: number; vz: number;
      rx: number; ry: number; rz: number; life: number;
    }[] = [];

    for (let i = 0; i < N; i++) {
      const r1 = 4 + Math.random() * 5;
      const m  = this._makeGear(4 + Math.floor(Math.random() * 4), r1, r1 * 1.45, 3,
        Math.random() > 0.5 ? 0xb07818 : 0x7a4e12, 0x200a00);
      (m.material as THREE.MeshStandardMaterial).transparent = true;
      m.position.copy(center);
      this._scene.add(m);
      const ang = (i / N) * Math.PI * 2 + Math.random() * 0.7;
      const spd = 80 + Math.random() * 140;
      frags.push({
        mesh: m, geo: m.geometry as THREE.BufferGeometry, mat: m.material as THREE.Material,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        vz: 35 + Math.random() * 70,
        rx: (Math.random() - 0.5) * 14, ry: (Math.random() - 0.5) * 14,
        rz: (Math.random() - 0.5) * 10,
        life: 0.4 + Math.random() * 0.35,
      });
    }

    // 잉크 파티클 구름
    const INK = 24;
    const inkPos  = new Float32Array(INK * 3);
    const inkGeo  = new THREE.BufferGeometry();
    inkGeo.setAttribute('position', new THREE.BufferAttribute(inkPos, 3));
    const inkMat  = new THREE.PointsMaterial({
      color: 0x120820, size: isCrit ? 15 : 10,
      transparent: true, opacity: 0.88, sizeAttenuation: false,
    });
    const inkCloud = new THREE.Points(inkGeo, inkMat);
    inkCloud.position.copy(center).setZ(2);
    this._scene.add(inkCloud);
    const inkV = Array.from({ length: INK }, () => ({
      x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200,
      z: Math.random() * 70,
    }));

    if (isCrit) this._spawnBubbleBurst(cx, cy);

    let elapsed = 0;
    const maxLife = frags.reduce((m, f) => Math.max(m, f.life), 0.55);

    this._effects.push({
      update: (dt) => {
        elapsed += dt;
        let alive = false;

        for (const f of frags) {
          if (!f.mesh.parent) continue;
          if (elapsed > f.life) {
            f.mesh.removeFromParent(); f.geo.dispose(); f.mat.dispose(); continue;
          }
          alive = true;
          const fade = 1 - elapsed / f.life;
          (f.mat as THREE.MeshStandardMaterial).opacity = fade;
          f.mesh.position.x += f.vx * dt;
          f.mesh.position.y += f.vy * dt;
          f.mesh.position.z += f.vz * dt;
          f.vz -= 230 * dt;
          f.mesh.rotation.x += f.rx * dt;
          f.mesh.rotation.y += f.ry * dt;
          f.mesh.rotation.z += f.rz * dt;
        }

        if (inkCloud.parent) {
          const t = elapsed / maxLife;
          if (t >= 1) {
            inkCloud.removeFromParent(); inkGeo.dispose(); inkMat.dispose();
          } else {
            alive = true;
            inkMat.opacity = 0.88 * (1 - t * t);
            const attr = inkGeo.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < INK; i++) {
              inkPos[i * 3]     += inkV[i].x * dt;
              inkPos[i * 3 + 1] += inkV[i].y * dt;
              inkPos[i * 3 + 2] += inkV[i].z * dt;
              inkV[i].z -= 160 * dt;
            }
            attr.needsUpdate = true;
          }
        }

        return alive;
      },
    });
  }

  // ── 크리티컬: 심해 생물발광 버블 폭발 ─────────────────────────
  private _spawnBubbleBurst(cx: number, cy: number): void {
    const PALETTE = [0x20d8c0, 0x1090e8, 0x50e870, 0x3040ff, 0x80ffe0];
    const center = this._px(cx, cy);

    const bubbles: {
      mesh: THREE.Mesh; geo: THREE.SphereGeometry; mat: THREE.MeshStandardMaterial;
      vx: number; vy: number; vz: number; life: number;
    }[] = [];

    for (let i = 0; i < 15; i++) {
      const r = 5 + Math.random() * 12;
      const geo = new THREE.SphereGeometry(r, 8, 6);
      const col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const mat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 1.4,
        transparent: true, opacity: 0.82, roughness: 0.04, metalness: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(center);
      this._scene.add(mesh);
      const ang  = (i / 15) * Math.PI * 2 + Math.random();
      const spd  = 100 + Math.random() * 240;
      bubbles.push({
        mesh, geo, mat,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        vz: (Math.random() - 0.15) * 120,
        life: 0.38 + Math.random() * 0.32,
      });
    }

    let elapsed = 0;
    this._effects.push({
      update: (dt) => {
        elapsed += dt;
        let alive = false;
        for (const b of bubbles) {
          if (!b.mesh.parent) continue;
          if (elapsed > b.life) {
            b.mesh.removeFromParent(); b.geo.dispose(); b.mat.dispose(); continue;
          }
          alive = true;
          const fade = 1 - elapsed / b.life;
          b.mat.opacity = 0.82 * fade;
          b.mat.emissiveIntensity = 1.4 * fade;
          b.mesh.position.x += b.vx * dt;
          b.mesh.position.y += b.vy * dt;
          b.mesh.position.z += b.vz * dt;
          b.vz -= 170 * dt;
          b.mesh.scale.setScalar(1 + elapsed * 2.8);
        }
        return alive;
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  //  적 공격: 잉크 방울 연속 발사
  // ════════════════════════════════════════════════════════════
  spawnEnemyAttack(
    fromX: number, fromY: number,
    toX:   number, toY:   number,
    isCrit: boolean,
  ): void {
    const N = isCrit ? 9 : 6;

    const drops: {
      mesh: THREE.Mesh; geo: THREE.SphereGeometry; mat: THREE.MeshStandardMaterial;
      sx: number; sy: number; ex: number; ey: number; delay: number;
    }[] = [];

    for (let i = 0; i < N; i++) {
      const r   = isCrit ? 5 + Math.random() * 8 : 3 + Math.random() * 5;
      const geo = new THREE.SphereGeometry(r, 7, 5);
      const mat = new THREE.MeshStandardMaterial({
        color:    isCrit ? 0x380070 : 0x160030,
        emissive: isCrit ? 0x5500b0 : 0x240048,
        emissiveIntensity: 0.55,
        roughness: 0.65, metalness: 0.05,
        transparent: true, opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const from = this._px(fromX, fromY);
      mesh.position.copy(from);
      this._scene.add(mesh);

      const fromPt = this._px(
        fromX + (Math.random() - 0.5) * 28,
        fromY + (Math.random() - 0.5) * 28,
      );
      const toPt = this._px(
        toX + (Math.random() - 0.5) * 38,
        toY + (Math.random() - 0.5) * 38,
      );
      drops.push({
        mesh, geo, mat,
        sx: fromPt.x, sy: fromPt.y,
        ex: toPt.x,   ey: toPt.y,
        delay: i * 0.025,
      });
    }

    const dur = isCrit ? 0.40 : 0.32;
    let elapsed = 0;

    this._effects.push({
      update: (dt) => {
        elapsed += dt;
        let alive = false;

        for (const d of drops) {
          const lt = (elapsed - d.delay) / dur;
          if (lt <= 0) { alive = true; continue; }
          if (lt > 1.5) {
            if (d.mesh.parent) { d.mesh.removeFromParent(); d.geo.dispose(); d.mat.dispose(); }
            continue;
          }
          alive = true;
          const t = Math.min(lt, 1);
          d.mesh.position.x = d.sx + (d.ex - d.sx) * t;
          d.mesh.position.y = d.sy + (d.ey - d.sy) * t;
          d.mesh.position.z = Math.sin(t * Math.PI) * 28;

          if (t < 0.25) {
            d.mat.opacity = (t / 0.25) * 0.92;
          } else if (t > 0.7) {
            const sp = (t - 0.7) / 0.3;
            d.mat.opacity = 0.92 * (1 - sp);
            const s = 1 + sp * 2.8;
            d.mesh.scale.set(s, s * 0.28, s); // 착탄 시 납작하게 퍼짐
          } else {
            d.mat.opacity = 0.92;
            // 진행 방향으로 늘어남
            const ang = Math.atan2(d.ey - d.sy, d.ex - d.sx);
            d.mesh.rotation.z = -ang; // Three.js Y-up이므로 부호 반전
            d.mesh.scale.set(1 + t * 0.75, 1, 1);
          }
        }
        return alive;
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  //  사망 이펙트: 대형 기어 붕괴 + 잉크 홍수
  // ════════════════════════════════════════════════════════════
  spawnDeathEffect(cx: number, cy: number): void {
    const center = this._px(cx, cy);

    const main = this._makeGear(14, 26, 38, 11, 0x3a1808, 0x1a0800);
    (main.material as THREE.MeshStandardMaterial).transparent = true;
    main.position.copy(center);
    this._scene.add(main);

    // 작은 파편 기어 3개
    const frags = [0, 1, 2].map(i => {
      const r = 8 + i * 3;
      const m = this._makeGear(6, r, r * 1.4, 5, 0x5a2810, 0x200a00);
      (m.material as THREE.MeshStandardMaterial).transparent = true;
      m.position.copy(center);
      this._scene.add(m);
      return { mesh: m, vx: Math.cos(i * 2.1) * 90, vy: Math.sin(i * 2.1) * 90, vz: 50 + i * 20 };
    });

    // 잉크 홍수 파티클
    const INK = 55;
    const inkPos = new Float32Array(INK * 3);
    const inkGeo = new THREE.BufferGeometry();
    inkGeo.setAttribute('position', new THREE.BufferAttribute(inkPos, 3));
    const inkMat = new THREE.PointsMaterial({
      color: 0x0e0618, size: 13, transparent: true, opacity: 0, sizeAttenuation: false,
    });
    const inkCloud = new THREE.Points(inkGeo, inkMat);
    inkCloud.position.copy(center).setZ(2);
    this._scene.add(inkCloud);
    const inkV = Array.from({ length: INK }, () => ({
      x: (Math.random() - 0.5) * 240, y: (Math.random() - 0.5) * 240, z: Math.random() * 90,
    }));

    let elapsed = 0;
    const DUR = 1.05;

    this._effects.push({
      update: (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / DUR, 1);

        main.rotation.z += dt * (2.5 + t * 14);
        main.rotation.x += dt * t * 6;
        main.position.z = t * 45;
        (main.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - t * 1.35);
        main.scale.setScalar(1 + t * 0.45);

        for (const f of frags) {
          f.mesh.rotation.z += dt * 5;
          f.mesh.rotation.x += dt * 3;
          f.mesh.position.x += f.vx * dt;
          f.mesh.position.y += f.vy * dt;
          f.mesh.position.z += f.vz * dt;
          f.vz -= 180 * dt;
          (f.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - t * 1.2);
        }

        inkMat.opacity = t < 0.1 ? (t / 0.1) * 0.9 : 0.9 * (1 - t);
        const attr = inkGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < INK; i++) {
          inkPos[i * 3]     += inkV[i].x * dt;
          inkPos[i * 3 + 1] += inkV[i].y * dt;
          inkPos[i * 3 + 2] += inkV[i].z * dt;
          inkV[i].z -= 160 * dt;
        }
        attr.needsUpdate = true;

        if (t >= 1) {
          [main, ...frags.map(f => f.mesh), inkCloud].forEach(o => {
            o.removeFromParent();
            if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose();
            if ((o as THREE.Mesh).material) ((o as THREE.Mesh).material as THREE.Material).dispose();
          });
          inkGeo.dispose(); inkMat.dispose();
          return false;
        }
        return true;
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  //  매 프레임 업데이트 (Phaser update() 에서 호출)
  // ════════════════════════════════════════════════════════════
  update(dt: number): void {
    if (!this._effects.length) return;
    this._effects = this._effects.filter(e => e.update(dt));
    this._renderer.render(this._scene, this._camera);
  }

  destroy(): void {
    this._effects = [];
    this._scene.clear();
    this._renderer.domElement.remove();
    this._renderer.dispose();
  }
}
