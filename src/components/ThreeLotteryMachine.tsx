/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sound } from '../utils/soundEngine';
import { GameId } from '../types/lottery';
import { LOTTERY_GAMES } from '../constants/games';
import { Camera, Volume2, VolumeX, Maximize2, RotateCcw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface ThreeLotteryMachineProps {
  gameId: GameId;
  isDrawing: boolean;
  drawnBalls: number[];
  specialBall?: number;
  currentDrawnNumber?: number | null;
  onBallExtracted?: (ballNum: number, isSpecial?: boolean) => void;
}

interface SimBall {
  mesh: THREE.Mesh;
  number: number;
  isSpecial: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  isExtracted: boolean;
  chuteProgress: number; // 0 to 1 when being drawn up chute
}

// Reusable scratch vectors to avoid GC in animation loop
const _tmpV1 = new THREE.Vector3();
const _tmpV2 = new THREE.Vector3();
const _tmpV3 = new THREE.Vector3();

export const ThreeLotteryMachine: React.FC<ThreeLotteryMachineProps> = ({
  gameId,
  isDrawing,
  drawnBalls,
  specialBall,
  currentDrawnNumber,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cameraView, setCameraView] = useState<'stage' | 'cage' | 'tray'>('stage');
  const [isMuted, setIsMuted] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [lastDrawnAnnounced, setLastDrawnAnnounced] = useState<number | null>(null);

  // References held across renders
  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    balls: [] as SimBall[],
    traySlots: [] as THREE.Vector3[],
    cageRotor: null as THREE.Group | null,
    targetCamPos: new THREE.Vector3(0, 4.2, 9.5),
    targetLookAt: new THREE.Vector3(0, 3.2, 0),
    currentLookAt: new THREE.Vector3(0, 3.2, 0),
    isDrawing: false,
    gameId: gameId,
    drawnBalls: [] as number[],
    specialBall: undefined as number | undefined,
    frameId: 0,
    isSoftwareGl: false,
  });

  // Keep stateRef up to date with props
  useEffect(() => {
    stateRef.current.isDrawing = isDrawing;
    stateRef.current.gameId = gameId;
    stateRef.current.drawnBalls = drawnBalls;
    stateRef.current.specialBall = specialBall;
  }, [isDrawing, gameId, drawnBalls, specialBall]);

  // Handle camera view presets
  const applyCameraPreset = useCallback((preset: 'stage' | 'cage' | 'tray') => {
    setCameraView(preset);
    if (preset === 'stage') {
      stateRef.current.targetCamPos.set(0, 4.8, 10.0);
      stateRef.current.targetLookAt.set(0, 3.2, 0);
    } else if (preset === 'cage') {
      stateRef.current.targetCamPos.set(0, 3.8, 5.2);
      stateRef.current.targetLookAt.set(0, 3.5, 0);
    } else if (preset === 'tray') {
      stateRef.current.targetCamPos.set(0, 2.2, 4.8);
      stateRef.current.targetLookAt.set(0, 1.4, 0);
    }
  }, []);

  // When currentDrawnNumber changes, trigger announcement sound and close up
  useEffect(() => {
    if (currentDrawnNumber !== null && currentDrawnNumber !== undefined && currentDrawnNumber !== lastDrawnAnnounced) {
      setLastDrawnAnnounced(currentDrawnNumber);
      sound.playBallExtraction();
      setTimeout(() => {
        sound.playNumberAnnounce(currentDrawnNumber);
      }, 400);
    }
  }, [currentDrawnNumber, lastDrawnAnnounced]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software GL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();
    stateRef.current.isSoftwareGl = isSoftwareGl;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b19);
    scene.fog = new THREE.FogExp2(0x060b19, 0.045);
    stateRef.current.scene = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.copy(stateRef.current.targetCamPos);
    camera.lookAt(stateRef.current.targetLookAt);
    stateRef.current.camera = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    stateRef.current.renderer = renderer;

    // 3. Procedural Studio PMREM Environment Map
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('PMREM environment init skipped:', e);
    }

    // 4. Studio Lighting Rig
    // Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keyLight.position.set(5, 8, 7);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 25;
      const d = 5;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    scene.add(keyLight);

    // Cool Fill Light
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    fillLight.position.set(-6, 4, 3);
    scene.add(fillLight);

    // Rim/Back Light
    const rimLight = new THREE.DirectionalLight(0xfbbf24, 1.6);
    rimLight.position.set(0, 7, -6);
    scene.add(rimLight);

    // Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x1e3a8a, 0x0f172a, 0.7);
    scene.add(hemiLight);

    // 5. Studio Stage Floor & Ground Decals
    const floorGeo = new THREE.CircleGeometry(14, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a1428,
      roughness: 0.35,
      metalness: 0.5,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Golden decorative concentric rings on floor
    const ringGeo1 = new THREE.RingGeometry(3.8, 3.9, 64);
    const ringGeo2 = new THREE.RingGeometry(6.2, 6.35, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.01;
    scene.add(ring1);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.01;
    scene.add(ring2);

    // Contact shadow beneath main pedestal
    const shadowGeo = new THREE.PlaneGeometry(5.5, 5.5);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);

    // 6. BUILD PROCEDURAL 3D LOTTERY MACHINE (Multi-part Composite Model)
    const machineGroup = new THREE.Group();
    scene.add(machineGroup);

    // Part A: Heavy Pedestal Base (Grounded at Y=0)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111c38,
      roughness: 0.25,
      metalness: 0.85,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.95,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.95,
    });

    // Base Tier 1
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.4, 36), baseMat);
    base1.position.y = 0.2;
    base1.castShadow = !isSoftwareGl;
    base1.receiveShadow = !isSoftwareGl;
    machineGroup.add(base1);

    // Base Tier 2 (Gold ring collar)
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.25, 36), goldMat);
    base2.position.y = 0.525;
    machineGroup.add(base2);

    // Center Column Support
    const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 1.2, 32), baseMat);
    colMesh.position.y = 1.25;
    colMesh.castShadow = !isSoftwareGl;
    machineGroup.add(colMesh);

    // Machine Deck Platform
    const deckMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 1.8, 0.3, 36), goldMat);
    deckMesh.position.y = 2.0;
    deckMesh.castShadow = !isSoftwareGl;
    machineGroup.add(deckMesh);

    // Part B: Cage Support Pillars & Rings
    const pillarMat = chromeMat;
    const numPillars = 4;
    for (let i = 0; i < numPillars; i++) {
      const angle = (i * Math.PI * 2) / numPillars;
      const px = Math.cos(angle) * 1.65;
      const pz = Math.sin(angle) * 1.65;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.9, 16), pillarMat);
      pillar.position.set(px, 3.55, pz);
      pillar.castShadow = !isSoftwareGl;
      machineGroup.add(pillar);
    }

    // Top Crown Ring
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.09, 16, 48), goldMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 5.0;
    machineGroup.add(crownRing);

    // Part C: Transparent Glass Tumbler Globe / Cage
    const cageRadius = 1.5;
    const cageGeo = new THREE.SphereGeometry(cageRadius, 32, 24);
    const cageMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: isSoftwareGl ? 0.35 : 0.85,
      transmission: isSoftwareGl ? 0 : 0.9,
      roughness: 0.05,
      metalness: 0.05,
      ior: 1.52,
      thickness: 0.4,
      depthWrite: false,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    cageMesh.position.set(0, 3.55, 0);
    cageMesh.renderOrder = 2;
    machineGroup.add(cageMesh);

    // Part D: Agitator Impeller / Rotor inside Cage
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 2.3, 0);
    const rotorHub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.2, 20), goldMat);
    rotorGroup.add(rotorHub);

    // 4 Agitator curved blades
    for (let i = 0; i < 4; i++) {
      const bAngle = (i * Math.PI * 2) / 4;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.04), chromeMat);
      blade.position.set(Math.cos(bAngle) * 0.45, 0.05, Math.sin(bAngle) * 0.45);
      blade.rotation.y = -bAngle + 0.3;
      rotorGroup.add(blade);
    }
    machineGroup.add(rotorGroup);
    stateRef.current.cageRotor = rotorGroup;

    // Part E: Pneumatic Extraction Chute (Arch Tube)
    // Runs from top of cage down to the front presentation tray
    const chuteCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 4.8, 0),
      new THREE.Vector3(0, 5.3, 0.4),
      new THREE.Vector3(0, 4.5, 1.4),
      new THREE.Vector3(0, 2.8, 1.8),
      new THREE.Vector3(0, 1.6, 1.8),
    ]);
    const chuteGeo = new THREE.TubeGeometry(chuteCurve, 32, 0.18, 16, false);
    const chuteMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: isSoftwareGl ? 0.4 : 0.75,
      transmission: isSoftwareGl ? 0 : 0.85,
      roughness: 0.1,
      metalness: 0.1,
      depthWrite: false,
    });
    const chuteMesh = new THREE.Mesh(chuteGeo, chuteMat);
    machineGroup.add(chuteMesh);

    // Gold collar couplings on chute
    const chuteCollarGeo = new THREE.TorusGeometry(0.2, 0.04, 12, 24);
    const collar1 = new THREE.Mesh(chuteCollarGeo, goldMat);
    collar1.position.set(0, 5.1, 0.2);
    machineGroup.add(collar1);
    const collar2 = new THREE.Mesh(chuteCollarGeo, goldMat);
    collar2.position.set(0, 1.6, 1.8);
    collar2.rotation.x = Math.PI / 2;
    machineGroup.add(collar2);

    // Part F: Front Winning Ball Display Pedestal / Tray
    const trayBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 0.9), baseMat);
    trayBase.position.set(0, 1.4, 2.0);
    trayBase.castShadow = !isSoftwareGl;
    trayBase.receiveShadow = !isSoftwareGl;
    machineGroup.add(trayBase);

    const trayTrim = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 0.96), goldMat);
    trayTrim.position.set(0, 1.25, 2.0);
    machineGroup.add(trayTrim);

    // Calculate slots on tray for drawn balls (up to 7 balls: 6 main + 1 special)
    const traySlots: THREE.Vector3[] = [];
    const maxSlots = 7;
    const slotSpacing = 0.42;
    const startX = -((maxSlots - 1) * slotSpacing) / 2;

    for (let i = 0; i < maxSlots; i++) {
      const slotX = startX + i * slotSpacing;
      const slotPos = new THREE.Vector3(slotX, 1.62, 2.0);
      traySlots.push(slotPos);

      // Visual circular dimple on the tray
      const dimple = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 20), goldMat);
      dimple.position.set(slotX, 1.51, 2.0);
      machineGroup.add(dimple);
    }
    stateRef.current.traySlots = traySlots;

    // 7. GENERATE NUMBER BALL TEXTURES & 3D BALL MESHES
    const ballColors = [
      '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
      '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
    ];

    function createBallTexture(num: number, isSpecial = false): THREE.CanvasTexture {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Background color
      const bgColor = isSpecial ? '#f59e0b' : ballColors[(num - 1) % ballColors.length] || '#3b82f6';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 256, 256);

      // Gloss gradient overlay
      const grad = ctx.createRadialGradient(100, 80, 20, 128, 128, 140);
      grad.addColorStop(0, 'rgba(255,255,255,0.4)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // White circular number medallion
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 128, 64, 0, Math.PI * 2);
      ctx.fill();

      // Golden ring for special ball
      if (isSpecial) {
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 8;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Large bold number text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const numStr = num < 10 ? `0${num}` : `${num}`;
      ctx.fillText(numStr, 128, 128);

      // Underline on numbers 6 and 9 for legibility
      if (num === 6 || num === 9 || num === 66 || num === 99) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(100, 168);
        ctx.lineTo(156, 168);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    }

    // Determine balls count for current game
    const game = LOTTERY_GAMES[gameId] || LOTTERY_GAMES.mega645;
    const totalSimBalls = Math.min(game.totalBalls, 45); // e.g. 45 or 35 balls in cage
    const ballRadius = 0.13;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 18, 14);

    const ballsList: SimBall[] = [];

    for (let i = 1; i <= totalSimBalls; i++) {
      const isSpec = game.hasSpecialBall && i === totalSimBalls;
      const ballTex = createBallTexture(i, isSpec);
      const ballMat = new THREE.MeshStandardMaterial({
        map: ballTex,
        roughness: 0.25,
        metalness: 0.35,
      });

      const bMesh = new THREE.Mesh(ballGeo, ballMat);
      bMesh.castShadow = !isSoftwareGl;

      // Initial random position inside cage globe (radius ~1.2)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 0.95;
      const sinPhi = Math.sin(phi);

      const px = r * sinPhi * Math.cos(theta);
      const py = 3.55 + (r * Math.cos(phi) * 0.7 - 0.2); // clustered near bottom agitator
      const pz = r * sinPhi * Math.sin(theta);

      bMesh.position.set(px, py, pz);
      scene.add(bMesh);

      // Random initial velocity
      const vx = (Math.random() - 0.5) * 1.5;
      const vy = Math.random() * 2.5;
      const vz = (Math.random() - 0.5) * 1.5;

      ballsList.push({
        mesh: bMesh,
        number: i,
        isSpecial: isSpec,
        position: bMesh.position,
        velocity: new THREE.Vector3(vx, vy, vz),
        radius: ballRadius,
        isExtracted: false,
        chuteProgress: 0,
      });
    }
    stateRef.current.balls = ballsList;

    // 8. RESIZE LISTENER
    const handleResize = () => {
      if (!container || !stateRef.current.renderer || !stateRef.current.camera) return;
      const nw = container.clientWidth || 800;
      const nh = container.clientHeight || 500;
      stateRef.current.camera.aspect = nw / nh;
      stateRef.current.camera.updateProjectionMatrix();
      stateRef.current.renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    // 9. ANIMATION LOOP & PHYSICS
    const clock = new THREE.Clock();
    const cageCenter = new THREE.Vector3(0, 3.55, 0);
    const cageBoundRadius = cageRadius - ballRadius - 0.05;

    let tickSoundTimer = 0;

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const current = stateRef.current;
      const drawing = current.isDrawing;

      // A. Smooth Camera Damping
      if (current.camera) {
        current.camera.position.x = THREE.MathUtils.damp(current.camera.position.x, current.targetCamPos.x, 3.5, dt);
        current.camera.position.y = THREE.MathUtils.damp(current.camera.position.y, current.targetCamPos.y, 3.5, dt);
        current.camera.position.z = THREE.MathUtils.damp(current.camera.position.z, current.targetCamPos.z, 3.5, dt);

        current.currentLookAt.x = THREE.MathUtils.damp(current.currentLookAt.x, current.targetLookAt.x, 3.5, dt);
        current.currentLookAt.y = THREE.MathUtils.damp(current.currentLookAt.y, current.targetLookAt.y, 3.5, dt);
        current.currentLookAt.z = THREE.MathUtils.damp(current.currentLookAt.z, current.targetLookAt.z, 3.5, dt);

        current.camera.lookAt(current.currentLookAt);
      }

      // B. Rotate Impeller Rotor
      if (current.cageRotor) {
        const spinSpeed = drawing ? 12.0 : 3.5;
        current.cageRotor.rotation.y += spinSpeed * dt;
      }

      // Occasional clinking sound when spinning fast
      tickSoundTimer += dt;
      if (drawing && tickSoundTimer > 0.35) {
        tickSoundTimer = 0;
        sound.playBallCollision();
      }

      // C. Balls Physics & Bouncing
      const balls = current.balls;
      const gravity = -6.5;
      const agitationForce = drawing ? 14.0 : 5.5;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];

        // Check if this ball was drawn
        const drawnIdx = current.drawnBalls.indexOf(b.number);
        const isDrawn = drawnIdx >= 0;

        if (isDrawn) {
          // Ball is extracted onto tray slot
          b.isExtracted = true;
          const targetSlot = current.traySlots[drawnIdx] || current.traySlots[0];

          if (b.chuteProgress < 1.0) {
            b.chuteProgress = Math.min(1.0, b.chuteProgress + dt * 1.5);
            // Follow curve into slot
            const pointOnCurve = chuteCurve.getPoint(b.chuteProgress);
            b.mesh.position.lerp(pointOnCurve, 0.4);
            // Rotate ball to face front
            b.mesh.rotation.y += dt * 4;
          } else {
            // Sits resting in slot, face directly forward to camera
            b.mesh.position.lerp(targetSlot, 0.2);
            b.mesh.rotation.set(0, 0, 0);
          }
          continue;
        }

        // Inside cage bouncing physics
        // Apply gravity
        b.velocity.y += gravity * dt;

        // Upward air blower / impeller jet from bottom
        const distFromCenterXZ = Math.hypot(b.position.x, b.position.z);
        if (b.position.y < cageCenter.y - 0.4 && distFromCenterXZ < 1.0) {
          // Centrifugal + upward impulse
          b.velocity.y += agitationForce * dt * (1 + Math.random() * 0.5);
          b.velocity.x += (-b.position.z) * (drawing ? 8.0 : 3.0) * dt;
          b.velocity.z += b.position.x * (drawing ? 8.0 : 3.0) * dt;
        }

        // Damping / air drag
        b.velocity.multiplyScalar(0.985);

        // Advance position
        b.position.addScaledVector(b.velocity, dt);

        // Spherical boundary collision against cage walls
        _tmpV1.subVectors(b.position, cageCenter);
        const distToCenter = _tmpV1.length();

        if (distToCenter > cageBoundRadius) {
          _tmpV1.normalize();
          // Snap position back inside boundary
          b.position.copy(cageCenter).addScaledVector(_tmpV1, cageBoundRadius);

          // Reflect velocity vector
          const dot = b.velocity.dot(_tmpV1);
          if (dot > 0) {
            _tmpV2.copy(_tmpV1).multiplyScalar(2 * dot);
            b.velocity.sub(_tmpV2);
            b.velocity.multiplyScalar(0.75); // Restitution elasticity
          }
        }

        // Rotate sphere to simulate rolling
        b.mesh.rotation.x += b.velocity.z * dt * 2;
        b.mesh.rotation.z -= b.velocity.x * dt * 2;
      }

      // D. Render Frame
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }

      stateRef.current.frameId = requestAnimationFrame(tick);
    };

    stateRef.current.frameId = requestAnimationFrame(tick);

    // 10. CLEANUP ON UNMOUNT
    return () => {
      cancelAnimationFrame(stateRef.current.frameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Dispose materials & geometries
      scene.clear();
    };
  }, [gameId]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Spec Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 shadow-lg backdrop-blur-md">
        <div className={`w-2.5 h-2.5 rounded-full ${isDrawing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
        <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          {LOTTERY_GAMES[gameId]?.name} Studio 3D
        </span>
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
          {isDrawing ? 'ĐANG QUAY SỐ' : 'SẴN SÀNG'}
        </span>
      </div>

      {/* Collapsible Bottom Control Dock (Compliant with Three.js Skill layout) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl transition-all duration-300 ${
          hudCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        {/* Toggle Collapse Pill */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setHudCollapsed(!hudCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-900/90 hover:bg-slate-800 border-t border-x border-slate-700 text-[11px] text-slate-300 font-medium shadow-md transition-colors"
          >
            {hudCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                Mở rộng bảng điều khiển 3D
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                Thu gọn (Chế độ xem toàn màn hình)
              </>
            )}
          </button>
        </div>

        {/* Dock Controls Container */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Camera View Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 flex items-center gap-1 mr-1">
              <Camera className="w-3.5 h-3.5 text-amber-400" /> Góc quay:
            </span>
            <button
              onClick={() => applyCameraPreset('stage')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                cameraView === 'stage'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Toàn cảnh
            </button>
            <button
              onClick={() => applyCameraPreset('cage')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                cameraView === 'cage'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Lồng quay
            </button>
            <button
              onClick={() => applyCameraPreset('tray')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                cameraView === 'tray'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Bàn kết quả
            </button>
          </div>

          {/* Audio & Ambience Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const muted = sound.toggleMute();
                setIsMuted(muted);
              }}
              className={`p-1.5 rounded-lg border transition-all ${
                isMuted
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => sound.toggleBgm()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
              title="Nhạc nền không gian xổ số"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Nhạc nền</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
