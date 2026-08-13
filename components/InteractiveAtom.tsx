"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type ElectronState = {
  mesh: THREE.Mesh;
  glow: THREE.Sprite;
  ring: number;
  phase: number;
  speed: number;
  dragOffset: THREE.Vector3;
  dragged: boolean;
  returning: boolean;
};

const MINT = new THREE.Color("#52c99c");
const CORAL = new THREE.Color("#ef725a");
const NEUTRON = new THREE.Color("#d6ded8");

function seeded(index: number, seed: number) {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function createGlowTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.22, color.replace("1)", ".35)"));
  gradient.addColorStop(1, color.replace("1)", "0)"));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function orbitPoint(phase: number, ring: number) {
  const point = new THREE.Vector3(
    Math.cos(phase) * 3.55,
    Math.sin(phase) * 1.42,
    Math.sin(phase * 2) * 0.18,
  );
  point.applyAxisAngle(new THREE.Vector3(0, 0, 1), ring * Math.PI / 3);
  point.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.28 + ring * 0.08);
  return point;
}

export default function InteractiveAtom() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-label", "Interactive 3D atom. Drag an electron and release it to return to orbit.");
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0.15, 10.6);

    scene.add(new THREE.AmbientLight(0xffffff, 1.45));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 5, 7);
    scene.add(keyLight);
    const mintLight = new THREE.PointLight(MINT, 18, 13, 2);
    mintLight.position.set(-3, 2, 4);
    scene.add(mintLight);
    const coralLight = new THREE.PointLight(CORAL, 20, 10, 2);
    coralLight.position.set(2.5, -2, 3);
    scene.add(coralLight);

    const atom = new THREE.Group();
    atom.rotation.set(-0.1, -0.18, -0.04);
    scene.add(atom);

    const nucleus = new THREE.Group();
    atom.add(nucleus);

    const nucleonGeometry = new THREE.IcosahedronGeometry(0.39, 3);
    const protonMaterial = new THREE.MeshPhysicalMaterial({
      color: CORAL,
      emissive: new THREE.Color("#8f251c"),
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.8,
      clearcoatRoughness: 0.16,
    });
    const neutronMaterial = new THREE.MeshPhysicalMaterial({
      color: NEUTRON,
      emissive: new THREE.Color("#365448"),
      emissiveIntensity: 0.13,
      roughness: 0.36,
      metalness: 0.03,
      clearcoat: 0.75,
      clearcoatRoughness: 0.2,
    });

    const nucleons: THREE.Mesh[] = [];
    const nucleonCount = 30;
    for (let index = 0; index < nucleonCount; index += 1) {
      const radius = 0.24 + Math.pow(index / nucleonCount, 0.6) * 1.15;
      const theta = index * 2.399963 + seeded(index, 7) * 0.3;
      const phi = Math.acos(1 - 2 * ((index + 0.5) / nucleonCount));
      const mesh = new THREE.Mesh(nucleonGeometry, index % 2 === 0 ? protonMaterial : neutronMaterial);
      mesh.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
      mesh.scale.setScalar(0.82 + seeded(index, 19) * 0.26);
      mesh.rotation.set(seeded(index, 31) * 3, seeded(index, 43) * 3, seeded(index, 59) * 3);
      nucleus.add(mesh);
      nucleons.push(mesh);
    }

    const nucleusShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.63, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: MINT,
        transparent: true,
        opacity: 0.025,
        roughness: 0.1,
        transmission: 0.16,
        side: THREE.BackSide,
      }),
    );
    nucleus.add(nucleusShell);

    const mintGlow = createGlowTexture("rgba(82,201,156,1)");
    const coralGlow = createGlowTexture("rgba(239,114,90,1)");
    if (coralGlow) {
      const nucleusAura = new THREE.Sprite(new THREE.SpriteMaterial({
        map: coralGlow,
        color: CORAL,
        opacity: 0.12,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      nucleusAura.scale.set(4.3, 4.3, 1);
      nucleus.add(nucleusAura);
    }

    const electrons: ElectronState[] = [];
    const ringGroups: THREE.Group[] = [];
    const electronGeometry = new THREE.SphereGeometry(0.16, 32, 32);

    for (let ring = 0; ring < 3; ring += 1) {
      const ringGroup = new THREE.Group();
      const points = Array.from({ length: 320 }, (_, index) => orbitPoint(index / 320 * Math.PI * 2, ring));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitalLine = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({
        color: ring === 2 ? CORAL : MINT,
        transparent: true,
        opacity: ring === 2 ? 0.29 : 0.22,
      }));
      ringGroup.add(orbitalLine);
      atom.add(ringGroup);
      ringGroups.push(ringGroup);

      const phase = ring * 2.04 + 0.65;
      const electronMaterial = new THREE.MeshPhysicalMaterial({
        color: ring === 2 ? CORAL : MINT,
        emissive: ring === 2 ? CORAL : MINT,
        emissiveIntensity: 2.8,
        roughness: 0.12,
        metalness: 0.14,
        clearcoat: 1,
      });
      const electronMesh = new THREE.Mesh(electronGeometry, electronMaterial);
      electronMesh.position.copy(orbitPoint(phase, ring));
      electronMesh.userData.electronIndex = ring;
      atom.add(electronMesh);

      const glowTexture = ring === 2 ? coralGlow : mintGlow;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture ?? undefined,
        color: ring === 2 ? CORAL : MINT,
        opacity: 0.55,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      glow.scale.set(0.95, 0.95, 1);
      electronMesh.add(glow);
      electrons.push({ mesh: electronMesh, glow, ring, phase, speed: 0.42 + ring * 0.075, dragOffset: new THREE.Vector3(), dragged: false, returning: false });
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const dragPoint = new THREE.Vector3();
    let activeElectron: ElectronState | null = null;
    let hoveredElectron: ElectronState | null = null;
    let lastTime = performance.now();
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pointerFromEvent = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const intersectElectron = () => {
      const intersections = raycaster.intersectObjects(electrons.map((electron) => electron.mesh), false);
      if (!intersections.length) return null;
      const index = intersections[0].object.userData.electronIndex as number;
      return electrons[index] ?? null;
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerFromEvent(event);
      if (activeElectron) {
        if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
          const localPoint = atom.worldToLocal(dragPoint.clone());
          activeElectron.dragOffset.lerp(localPoint.sub(orbitPoint(activeElectron.phase, activeElectron.ring)), 0.55);
        }
        return;
      }
      hoveredElectron = intersectElectron();
      renderer.domElement.style.cursor = hoveredElectron ? "grab" : "default";
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerFromEvent(event);
      const electron = intersectElectron();
      if (!electron) return;
      activeElectron = electron;
      activeElectron.dragged = true;
      activeElectron.returning = false;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
      const worldPosition = new THREE.Vector3();
      activeElectron.mesh.getWorldPosition(worldPosition);
      dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion), worldPosition);
    };

    const releaseElectron = (event: PointerEvent) => {
      if (!activeElectron) return;
      activeElectron.dragged = false;
      activeElectron.returning = true;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      activeElectron = null;
      renderer.domElement.style.cursor = hoveredElectron ? "grab" : "default";
    };

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.35 : 1.75));
      renderer.setSize(width, height, false);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", releaseElectron);
    renderer.domElement.addEventListener("pointercancel", releaseElectron);
    renderer.domElement.addEventListener("pointerleave", (event) => {
      if (activeElectron) releaseElectron(event);
    });
    window.addEventListener("resize", onResize, { passive: true });
    onResize();

    const render = (now = performance.now()) => {
      const delta = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;
      const elapsed = now / 1000;

      atom.rotation.y = Math.sin(elapsed * 0.12) * 0.08;
      atom.rotation.x = -0.1 + Math.cos(elapsed * 0.14) * 0.025;
      nucleus.rotation.y += delta * 0.16;
      nucleus.rotation.x += delta * 0.065;
      nucleus.scale.setScalar(1 + Math.sin(elapsed * 1.3) * 0.012);
      nucleons.forEach((mesh, index) => {
        mesh.rotation.x += delta * (0.08 + index % 3 * 0.02);
        mesh.rotation.y += delta * (0.06 + index % 4 * 0.015);
      });
      ringGroups.forEach((group, index) => {
        group.rotation.z = Math.sin(elapsed * 0.25 + index) * 0.018;
      });

      electrons.forEach((electron) => {
        if (!electron.dragged) electron.phase += delta * electron.speed;
        if (electron.returning) {
          electron.dragOffset.multiplyScalar(Math.pow(0.005, delta));
          if (electron.dragOffset.lengthSq() < 0.0001) {
            electron.dragOffset.set(0, 0, 0);
            electron.returning = false;
          }
        }
        const target = orbitPoint(electron.phase, electron.ring).add(electron.dragOffset);
        electron.mesh.position.copy(target);
        const focused = electron === activeElectron || electron === hoveredElectron;
        const targetScale = focused ? 1.55 : 1;
        electron.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.16);
        electron.glow.material.opacity += ((focused ? 0.95 : 0.55) - electron.glow.material.opacity) * 0.14;
      });

      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", releaseElectron);
      renderer.domElement.removeEventListener("pointercancel", releaseElectron);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material?.dispose();
        }
      });
      mintGlow?.dispose();
      coralGlow?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="interactive-atom-wrap">
      <div ref={mountRef} className="interactive-atom" />
      <div className="atom-interaction-label"><i /> DRAG AN ELECTRON <span>RELEASE TO RETURN TO ORBIT</span></div>
    </div>
  );
}
