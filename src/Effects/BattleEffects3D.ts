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
  private _renderer: THREE.WebGLRenderer | null = null;
  private _scene:    THREE.Scene | null = null;
  private _camera:   THREE.OrthographicCamera | null = null;
  private _effects:  Effect[] = [];
  private _pendingEffects: Effect[] = [];
  private _isUpdating = false;
  private _W: number;
  private _H: number;
  private _enabled = false;

  constructor(phaserCanvas: HTMLCanvasElement) {
    this._W = phaserCanvas.width;
    this._H = phaserCanvas.height;

    try {
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
      this._enabled = true;
    } catch {
      // WebGL 미지원/초기화 실패 환경에서는 효과를 무시하고 게임 진행 지속
      this._enabled = false;
    }
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

  private _add(obj: THREE.Object3D): void {
    this._scene?.add(obj);
  }

  // ── 이펙트 등록 공통 처리 ──────────────────────────────────────
  // update() 순회 중에 새 이펙트를 바로 _effects에 push하면,
  // 같은 프레임의 filter 재할당 과정에서 유실될 수 있다.
  // (=> 이펙트 로직은 사라졌는데 오브젝트만 scene에 남는 잔여물 문제)
  private _registerEffect(effect: Effect): void {
    if (this._isUpdating) this._pendingEffects.push(effect);
    else this._effects.push(effect);
  }

  // ── 공통 수명 보조: t(0~1)에서 자연스러운 감쇠 곡선 ────────────────
  //  - 다른 사람이 수정할 때 "왜 이렇게 꺼지지?"를 빠르게 파악할 수 있도록
  //    이펙트 감쇠 함수를 공통화해 둔다.
  private _easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  // ════════════════════════════════════════════════════════════
  //  아군 공격: 청동 톱니바퀴 투사체 + 증기 궤적
  // ════════════════════════════════════════════════════════════
  spawnAllyAttack(
    fromX: number, fromY: number,
    toX:   number, toY:   number,
    isCrit: boolean,
  ): void {
    if (!this._enabled) return;
    const gear = this._makeGear(
      10, 14, 20, 7,
      isCrit ? 0xffd040 : 0xc89030,
      isCrit ? 0x904010 : 0x3a1a00,
    );
    if (isCrit) (gear.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
    const from = this._px(fromX, fromY);
    const to   = this._px(toX, toY);
    gear.position.copy(from);
    this._add(gear);
    this._spawnReleaseFlash(fromX, fromY, isCrit);

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
    this._add(trail);
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

    this._registerEffect({
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
      this._add(m);
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
    this._add(inkCloud);
    const inkV = Array.from({ length: INK }, () => ({
      x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200,
      z: Math.random() * 70,
    }));

    if (isCrit) this._spawnBubbleBurst(cx, cy);
    this._spawnImpactShockwave(cx, cy, isCrit ? 0xffd77a : 0xcaa06a);

    let elapsed = 0;
    const maxLife = frags.reduce((m, f) => Math.max(m, f.life), 0.55);

    this._registerEffect({
      update: (dt) => {
        elapsed += dt;
        let alive = false;

        for (const f of frags) {
          if (!f.mesh.parent) continue;
          if (elapsed > f.life) {
            f.mesh.removeFromParent(); f.geo.dispose(); f.mat.dispose(); continue;
          }
          alive = true;
          const fade = 1 - this._easeOutQuad(elapsed / f.life);
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
            inkMat.opacity = 0.88 * (1 - this._easeOutQuad(t));
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

  // ── 착탄 쇼크웨이브: "맞았다"는 피드백을 즉시 전달하는 링 파동 ─────────
  //  구현 의도:
  //  1) 저비용(Plane/Ring 한 장)으로도 고급스럽게 보이는 레이어를 추가
  //  2) 파편/잉크와 분리된 타이밍으로 타격 가독성 강화
  private _spawnImpactShockwave(cx: number, cy: number, color: number): void {
    const center = this._px(cx, cy);
    const geo = new THREE.RingGeometry(10, 24, 38);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(center).setZ(3);
    this._add(ring);

    let elapsed = 0;
    const DUR = 0.22;
    this._registerEffect({
      update: (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / DUR, 1);
        const fade = 1 - this._easeOutQuad(t);
        ring.scale.setScalar(1 + t * 2.9);
        mat.opacity = 0.7 * fade;
        if (t >= 1) {
          ring.removeFromParent();
          geo.dispose(); mat.dispose();
          return false;
        }
        return true;
      },
    });
  }

  // ── 발동 플래시: 투사체 출발 시 짧은 잔광 + 링 ───────────────────
  private _spawnReleaseFlash(cx: number, cy: number, isCrit: boolean): void {
    const center = this._px(cx, cy);

    const ringGeo = new THREE.RingGeometry(8, isCrit ? 23 : 18, 30);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isCrit ? 0xffef99 : 0xdac08a,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(center);
    this._add(ring);

    const rayGeo = new THREE.PlaneGeometry(isCrit ? 54 : 42, isCrit ? 54 : 42);
    const rayMat = new THREE.MeshBasicMaterial({
      color: isCrit ? 0xffd45a : 0xd89a4a,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.copy(center).setZ(4);
    this._add(ray);

    let elapsed = 0;
    const DUR = isCrit ? 0.22 : 0.16;
    this._registerEffect({
      update: (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / DUR, 1);
        const fade = 1 - this._easeOutQuad(t);
        ring.scale.setScalar(1 + t * (isCrit ? 2.8 : 2.1));
        ringMat.opacity = 0.78 * fade;
        ray.rotation.z += dt * 5.5;
        ray.scale.setScalar(1 + t * 1.8);
        rayMat.opacity = 0.45 * fade;

        if (t >= 1) {
          ring.removeFromParent(); ray.removeFromParent();
          ringGeo.dispose(); ringMat.dispose();
          rayGeo.dispose();  rayMat.dispose();
          return false;
        }
        return true;
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
      this._add(mesh);
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
    this._registerEffect({
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
    if (!this._enabled) return;
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
      this._add(mesh);

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

    this._registerEffect({
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
        if (!alive) this._spawnEnemyHitBurst(toX, toY, isCrit);
        return alive;
      },
    });
  }

  // ── 적 공격 타격: 튀는 파티클 + 잔연기 ────────────────────────────
  private _spawnEnemyHitBurst(cx: number, cy: number, isCrit: boolean): void {
    const N = isCrit ? 44 : 28;
    const center = this._px(cx, cy);
    const pos = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: isCrit ? 0xff6ad5 : 0xc068ff,
      size: isCrit ? 9 : 6,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });
    const points = new THREE.Points(geo, mat);
    points.position.copy(center).setZ(2);
    this._add(points);
    this._spawnImpactShockwave(cx, cy, isCrit ? 0xff83f2 : 0xbd73ff);

    const vel = Array.from({ length: N }, () => {
      const ang = Math.random() * Math.PI * 2;
      const spd = (isCrit ? 200 : 140) * (0.5 + Math.random());
      return { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd, z: Math.random() * 80 };
    });

    let elapsed = 0;
    const DUR = isCrit ? 0.45 : 0.33;
    this._registerEffect({
      update: (dt) => {
        elapsed += dt;
        const t = Math.min(elapsed / DUR, 1);
        const attr = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < N; i++) {
          pos[i * 3]     += vel[i].x * dt;
          pos[i * 3 + 1] += vel[i].y * dt;
          pos[i * 3 + 2] += vel[i].z * dt;
          vel[i].z -= 220 * dt;
        }
        attr.needsUpdate = true;
        mat.opacity = 0.92 * (1 - this._easeOutQuad(t));

        if (t >= 1) {
          points.removeFromParent();
          geo.dispose(); mat.dispose();
          return false;
        }
        return true;
      },
    });
  }

  // ════════════════════════════════════════════════════════════
  //  사망 이펙트: 대형 기어 붕괴 + 잉크 홍수
  // ════════════════════════════════════════════════════════════
  spawnDeathEffect(cx: number, cy: number): void {
    if (!this._enabled) return;
    const center = this._px(cx, cy);

    const main = this._makeGear(14, 26, 38, 11, 0x3a1808, 0x1a0800);
    (main.material as THREE.MeshStandardMaterial).transparent = true;
    main.position.copy(center);
    this._add(main);

    // 작은 파편 기어 3개
    const frags = [0, 1, 2].map(i => {
      const r = 8 + i * 3;
      const m = this._makeGear(6, r, r * 1.4, 5, 0x5a2810, 0x200a00);
      (m.material as THREE.MeshStandardMaterial).transparent = true;
      m.position.copy(center);
      this._add(m);
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
    this._add(inkCloud);
    const inkV = Array.from({ length: INK }, () => ({
      x: (Math.random() - 0.5) * 240, y: (Math.random() - 0.5) * 240, z: Math.random() * 90,
    }));

    let elapsed = 0;
    const DUR = 1.05;

    this._registerEffect({
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
    if (!this._enabled || !this._renderer || !this._scene || !this._camera) return;
    if (!this._effects.length) {
      // 마지막 프레임 잔상을 지우기 위해 효과가 없을 때도 클리어
      this._renderer.clear();
      return;
    }

    this._isUpdating = true;
    const next: Effect[] = [];
    for (const effect of this._effects) {
      if (effect.update(dt)) next.push(effect);
    }
    this._isUpdating = false;
    if (this._pendingEffects.length) {
      next.push(...this._pendingEffects);
      this._pendingEffects.length = 0;
    }
    this._effects = next;
    this._renderer.render(this._scene, this._camera);
  }

  destroy(): void {
    this._effects = [];
    this._pendingEffects = [];
    this._isUpdating = false;
    this._scene?.clear();
    this._renderer?.domElement.remove();
    this._renderer?.dispose();
    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._enabled = false;
  }
}
