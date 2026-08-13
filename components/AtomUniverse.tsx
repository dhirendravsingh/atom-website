"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type AtomUniverseProps = {
  className?: string;
};

const MINT = new THREE.Color("#69d5ad");
const CORAL = new THREE.Color("#ef725a");
const PAPER = new THREE.Color("#f1f5ef");

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) return null;

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(105,213,173,0.7)");
  gradient.addColorStop(0.18, "rgba(105,213,173,0.25)");
  gradient.addColorStop(1, "rgba(105,213,173,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seededNoise(index: number, seed: number) {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function ellipsePoint(angle: number, ring: number, jitter = 0) {
  const radiusX = 3.45 + jitter;
  const radiusY = 1.18 + jitter * 0.4;
  const raw = new THREE.Vector3(
    Math.cos(angle) * radiusX,
    Math.sin(angle) * radiusY,
    Math.sin(angle * 2 + ring) * 0.12,
  );
  raw.applyAxisAngle(new THREE.Vector3(0, 0, 1), (Math.PI / 3) * ring);
  raw.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.2 + ring * 0.06);
  return raw;
}

export default function AtomUniverse({ className = "" }: AtomUniverseProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b09, 0.065);

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 10.4);

    const atom = new THREE.Group();
    atom.rotation.set(-0.08, -0.22, -0.05);
    scene.add(atom);

    const glowTexture = makeGlowTexture();
    if (glowTexture) {
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color: MINT,
        opacity: 0.72,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      aura.scale.set(8.5, 8.5, 1);
      atom.add(aura);
    }

    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.55, 3),
      new THREE.MeshBasicMaterial({ color: MINT, wireframe: true, transparent: true, opacity: 0.045 }),
    );
    atom.add(shell);

    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32, 5),
      new THREE.MeshPhysicalMaterial({
        color: CORAL,
        emissive: CORAL,
        emissiveIntensity: 2.6,
        roughness: 0.2,
        metalness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
    );
    atom.add(nucleus);

    const nucleusLight = new THREE.PointLight(CORAL, 22, 9, 1.8);
    atom.add(nucleusLight);
    scene.add(new THREE.AmbientLight(0xcfe8da, 0.45));
    const mintLight = new THREE.PointLight(MINT, 14, 14, 2);
    mintLight.position.set(3.2, 2.4, 4);
    scene.add(mintLight);

    const ringGroups: THREE.Group[] = [];
    const electrons: Array<{ mesh: THREE.Mesh; ring: number; phase: number }> = [];

    for (let ring = 0; ring < 3; ring += 1) {
      const ringGroup = new THREE.Group();
      const linePoints = Array.from({ length: 260 }, (_, index) => ellipsePoint((index / 260) * Math.PI * 2, ring));
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const line = new THREE.LineLoop(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: ring === 2 ? CORAL : ring === 1 ? PAPER : MINT,
          transparent: true,
          opacity: ring === 2 ? 0.22 : 0.16,
          blending: THREE.AdditiveBlending,
        }),
      );
      ringGroup.add(line);

      const particleCount = 420;
      const particlePositions = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);

      for (let index = 0; index < particleCount; index += 1) {
        const angle = (index / particleCount) * Math.PI * 2 + seededNoise(index, ring) * 0.035;
        const jitter = (seededNoise(index, ring + 9) - 0.5) * 0.14;
        const point = ellipsePoint(angle, ring, jitter);
        particlePositions[index * 3] = point.x;
        particlePositions[index * 3 + 1] = point.y;
        particlePositions[index * 3 + 2] = point.z + (seededNoise(index, ring + 21) - 0.5) * 0.1;

        const color = ring === 2 ? CORAL : ring === 1 ? PAPER : MINT;
        const brightness = 0.5 + seededNoise(index, ring + 31) * 0.5;
        particleColors[index * 3] = color.r * brightness;
        particleColors[index * 3 + 1] = color.g * brightness;
        particleColors[index * 3 + 2] = color.b * brightness;
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({
          size: ring === 2 ? 0.026 : 0.022,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.88,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ringGroup.add(particles);

      const electron = new THREE.Mesh(
        new THREE.SphereGeometry(ring === 2 ? 0.095 : 0.075, 24, 24),
        new THREE.MeshBasicMaterial({ color: ring === 2 ? CORAL : MINT }),
      );
      electron.position.copy(ellipsePoint(ring * 2.1, ring));
      electron.add(new THREE.PointLight(ring === 2 ? CORAL : MINT, 3.5, 2.2, 2));
      ringGroup.add(electron);
      electrons.push({ mesh: electron, ring, phase: ring * 2.1 });

      atom.add(ringGroup);
      ringGroups.push(ringGroup);
    }

    const dustCount = 1700;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      const theta = seededNoise(index, 71) * Math.PI * 2;
      const radius = 2.2 + Math.pow(seededNoise(index, 83), 0.8) * 4.5;
      const vertical = (seededNoise(index, 97) - 0.5) * 4.2;
      dustPositions[index * 3] = Math.cos(theta) * radius;
      dustPositions[index * 3 + 1] = vertical;
      dustPositions[index * 3 + 2] = Math.sin(theta) * radius * 0.45 + (seededNoise(index, 113) - 0.5) * 2;

      const useCoral = seededNoise(index, 131) > 0.9;
      const color = useCoral ? CORAL : MINT;
      const brightness = 0.16 + seededNoise(index, 149) * 0.55;
      dustColors[index * 3] = color.r * brightness;
      dustColors[index * 3 + 1] = color.g * brightness;
      dustColors[index * 3 + 2] = color.b * brightness;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        size: 0.018,
        transparent: true,
        opacity: 0.62,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(dust);

    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    let scrollTarget = 0;
    let scrollValue = 0;
    let visible = true;
    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onPointerMove = (event: PointerEvent) => {
      const bounds = mount.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointerTarget.y = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    const onScroll = () => {
      scrollTarget = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 3);
    };
    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.35 : 1.8));
      renderer.setSize(width, height, false);
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { threshold: 0.01 });
    intersectionObserver.observe(mount);

    mount.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onScroll();
    onResize();

    const startTime = performance.now();
    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      pointer.lerp(pointerTarget, 0.045);
      scrollValue += (scrollTarget - scrollValue) * 0.035;

      atom.rotation.y = elapsed * 0.055 + pointer.x * 0.22 + scrollValue * 0.26;
      atom.rotation.x = -0.1 + pointer.y * 0.15 + Math.sin(elapsed * 0.25) * 0.035;
      atom.rotation.z = -0.05 + scrollValue * 0.08;
      atom.position.y = -scrollValue * 0.28;
      shell.rotation.x = elapsed * 0.04;
      shell.rotation.y = elapsed * -0.05;
      nucleus.rotation.x = elapsed * 0.35;
      nucleus.rotation.y = elapsed * 0.48;
      dust.rotation.y = elapsed * -0.012 + pointer.x * 0.03;
      dust.rotation.x = pointer.y * 0.02;

      ringGroups.forEach((group, index) => {
        group.rotation.z = Math.sin(elapsed * 0.16 + index) * 0.035;
      });
      electrons.forEach((electron, index) => {
        const speed = 0.22 + index * 0.035;
        electron.mesh.position.copy(ellipsePoint(electron.phase + elapsed * speed, electron.ring));
      });

      camera.position.x += (pointer.x * 0.38 - camera.position.x) * 0.035;
      camera.position.y += (pointer.y * 0.2 - camera.position.y) * 0.035;
      camera.position.z += (10.4 - scrollValue * 0.38 - camera.position.z) * 0.035;
      camera.lookAt(0, -scrollValue * 0.12, 0);

      if (visible) renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(frame);
      mount.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      intersectionObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material?.dispose();
        }
      });
      glowTexture?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className={`atom-universe ${className}`} aria-hidden="true" />;
}
