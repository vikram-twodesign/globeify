import * as THREE from "three";
import type {
  GlobeBehaviour,
  Pin,
  PinStyle,
  ThemeColors,
} from "@/lib/types";
import { buildGlobeTexture } from "./geoTexture";
import { type Feature, latLngToVec3 } from "./topo";

const GLOBE_RADIUS = 1;
const CAMERA_Z = 3.2;
const BASE_HEAD_RADIUS = 0.008;
const BASE_STALK_HEIGHT = 0.04;
const BASE_STALK_RADIUS = 0.0018;
const BASE_HIT_RADIUS = 0.028;
const BASE_RING_RADIUS = 0.004;
const INTERACT_RESUME_MS = 3000;
const FOCUS_PAUSE_MS = 5000;

export type PinSizeKey = PinStyle["size"];
export type RotationSpeedKey = GlobeBehaviour["rotationSpeed"];

export const PIN_SIZE_MULTIPLIERS: Record<PinSizeKey, number> = {
  small: 0.7,
  medium: 1,
  large: 1.4,
};

export const ROTATION_SPEEDS: Record<RotationSpeedKey, number> = {
  slow: 0.001,
  medium: 0.002,
  fast: 0.004,
};

export interface GlobeSceneOptions {
  mount: HTMLElement;
  colors: ThemeColors;
  behaviour: GlobeBehaviour;
  pinStyle: PinStyle;
  pins: Pin[];
  features?: Feature[] | null;
  texSize?: number;
  /** Notifies when a pin is selected (click) or deselected (click on empty space). */
  onPinSelect?: (pin: Pin | null) => void;
  /** Notifies when a pin is hovered. Receives the pin and the *client* (viewport) pointer position. */
  onPinHover?: (pin: Pin | null, clientX: number, clientY: number) => void;
}

type PinUserData = {
  pinId: string;
  pin: Pin;
  head?: THREE.Mesh;
  ring?: THREE.Mesh;
};

/**
 * Framework-agnostic Three.js globe controller. Built to be driven from a
 * React wrapper (or anything else) by calling `setX` methods as props change.
 */
export class GlobeScene {
  private mount: HTMLElement;
  private colors: ThemeColors;
  private behaviour: GlobeBehaviour;
  private pinStyle: PinStyle;
  private pins: Pin[];
  private features: Feature[] | null;
  private texSize: number;

  private onPinSelect?: (pin: Pin | null) => void;
  private onPinHover?: (pin: Pin | null, clientX: number, clientY: number) => void;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private globe: THREE.Mesh;
  private globeMat: THREE.MeshPhongMaterial;
  private atmosphere: THREE.Mesh;
  private atmosphereMat: THREE.ShaderMaterial;
  private pinGroup: THREE.Group;
  private raycaster = new THREE.Raycaster();
  private mouseNdc = new THREE.Vector2();

  private mapTexture: THREE.CanvasTexture | null = null;

  private rafId: number | null = null;
  private startTime = 0;
  private isDragging = false;
  private dragMoved = false;
  private previousMouse = { x: 0, y: 0 };
  private rotationVelocity = { x: 0, y: 0 };
  private autoRotateActive: boolean;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private targetRotation: { x: number; y: number } | null = null;
  private hoveredPinId: string | null = null;

  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  constructor(options: GlobeSceneOptions) {
    this.mount = options.mount;
    this.colors = options.colors;
    this.behaviour = options.behaviour;
    this.pinStyle = options.pinStyle;
    this.pins = options.pins;
    this.features = options.features ?? null;
    this.texSize = options.texSize ?? 4096;
    this.onPinSelect = options.onPinSelect;
    this.onPinHover = options.onPinHover;

    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = CAMERA_Z;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.mount.appendChild(canvas);

    // Globe
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96);
    this.globeMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x111111,
      shininess: 12,
    });
    this.globe = new THREE.Mesh(globeGeo, this.globeMat);
    this.scene.add(this.globe);

    // Atmosphere
    this.atmosphereMat = new THREE.ShaderMaterial({
      vertexShader:
        "varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec3 vN;void main(){float i=pow(0.58-dot(vN,vec3(0,0,1)),3.5);gl_FragColor=vec4(.6,.6,.6,i*.15);}",
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS + 0.08, 64, 64),
      this.atmosphereMat
    );
    this.scene.add(this.atmosphere);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl1 = new THREE.DirectionalLight(0xffffff, 0.5);
    dl1.position.set(5, 3, 5);
    this.scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0x888888, 0.2);
    dl2.position.set(-4, -2, -4);
    this.scene.add(dl2);

    // Pin container lives on globe so it rotates with it
    this.pinGroup = new THREE.Group();
    this.globe.add(this.pinGroup);

    this.autoRotateActive = this.behaviour.autoRotate;

    // Build initial texture/pins if we already have features
    if (this.features) {
      this.rebuildTexture();
    }
    this.rebuildPins();

    this.attachListeners();

    // ResizeObserver keeps canvas sized to container.
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.mount);
    }

    this.startTime = performance.now();
    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);
  }

  // ──────────────────────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────────────────────

  setFeatures(features: Feature[]): void {
    this.features = features;
    this.rebuildTexture();
  }

  setTheme(
    colors: ThemeColors,
    opts?: { showGraticule?: boolean; showBorders?: boolean }
  ): void {
    this.colors = colors;
    if (opts?.showGraticule !== undefined) {
      this.behaviour = { ...this.behaviour, showGraticule: opts.showGraticule };
    }
    if (opts?.showBorders !== undefined) {
      this.behaviour = { ...this.behaviour, showBorders: opts.showBorders };
    }
    this.rebuildTexture();
    // Pin head colour is theme-driven, so rebuild pin materials too.
    this.applyPinColors();
  }

  setBehaviour(behaviour: GlobeBehaviour): void {
    const prev = this.behaviour;
    this.behaviour = behaviour;
    if (
      prev.showGraticule !== behaviour.showGraticule ||
      prev.showBorders !== behaviour.showBorders
    ) {
      this.rebuildTexture();
    }
    // When autoRotate is turned off we should stop rotating immediately.
    if (!behaviour.autoRotate) {
      this.autoRotateActive = false;
      if (this.resumeTimer) {
        clearTimeout(this.resumeTimer);
        this.resumeTimer = null;
      }
    } else {
      // Turning autoRotate back on: resume immediately (unless interacting).
      if (!this.isDragging && !this.resumeTimer) {
        this.autoRotateActive = true;
      }
    }
  }

  setPinStyle(pinStyle: PinStyle): void {
    const prev = this.pinStyle;
    this.pinStyle = pinStyle;
    if (prev.size !== pinStyle.size || prev.showRing !== pinStyle.showRing) {
      this.rebuildPins();
    }
  }

  setPins(pins: Pin[]): void {
    this.pins = pins;
    this.rebuildPins();
  }

  focusPin(pinId: string): void {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) return;
    const pos = latLngToVec3(pin.lat, pin.lng, GLOBE_RADIUS);
    this.targetRotation = {
      x: -Math.asin(pos.y / GLOBE_RADIUS),
      y: Math.atan2(pos.x, pos.z),
    };
    // Pause auto-rotate while animating to focus.
    this.autoRotateActive = false;
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      if (this.behaviour.autoRotate && this.behaviour.idleBehaviour === "resume") {
        this.autoRotateActive = true;
      }
    }, FOCUS_PAUSE_MS);
  }

  resize(): void {
    if (this.destroyed) return;
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = null;

    this.detachListeners();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Dispose pin meshes
    this.disposePinGroup();

    // Dispose globe
    this.globe.geometry.dispose();
    this.globeMat.dispose();
    this.atmosphere.geometry.dispose();
    this.atmosphereMat.dispose();
    if (this.mapTexture) {
      this.mapTexture.dispose();
      this.mapTexture = null;
    }
    this.renderer.dispose();

    // Remove canvas from DOM
    const canvas = this.renderer.domElement;
    if (canvas.parentNode === this.mount) {
      this.mount.removeChild(canvas);
    }
  }

  // ──────────────────────────────────────────────────────────────
  //  Internal
  // ──────────────────────────────────────────────────────────────

  private rebuildTexture(): void {
    if (!this.features) return;
    const canvas = buildGlobeTexture({
      features: this.features,
      colors: this.colors,
      showGraticule: this.behaviour.showGraticule,
      showBorders: this.behaviour.showBorders,
      texSize: this.texSize,
    });
    if (this.mapTexture) {
      this.mapTexture.dispose();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.mapTexture = texture;
    this.globeMat.map = texture;
    this.globeMat.needsUpdate = true;
  }

  private disposePinGroup(): void {
    while (this.pinGroup.children.length) {
      const c = this.pinGroup.children[0];
      c.traverse((ch) => {
        const mesh = ch as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else if (material) {
          material.dispose();
        }
      });
      this.pinGroup.remove(c);
    }
  }

  private rebuildPins(): void {
    this.disposePinGroup();
    const mult = PIN_SIZE_MULTIPLIERS[this.pinStyle.size];
    const headR = BASE_HEAD_RADIUS * mult;
    const stalkH = BASE_STALK_HEIGHT * mult;
    const stalkR = BASE_STALK_RADIUS * mult;
    const hitR = BASE_HIT_RADIUS * mult;
    const ringR = BASE_RING_RADIUS * mult;
    const pinColorHex = toHexInt(this.colors.pin, 0xffffff);

    for (const pin of this.pins) {
      const group = new THREE.Group();
      const userData: PinUserData = { pinId: pin.id, pin };
      group.userData = userData;

      // Stalk
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(stalkR, stalkR, stalkH, 6),
        new THREE.MeshBasicMaterial({ color: 0xbbbbbb })
      );
      stalk.position.y = stalkH / 2;
      group.add(stalk);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(headR, 10, 10),
        new THREE.MeshPhongMaterial({
          color: pinColorHex,
          emissive: 0x555555,
          specular: 0xaaaaaa,
          shininess: 40,
        })
      );
      head.position.y = stalkH + headR;
      group.add(head);
      userData.head = head;

      // Base dot / ring
      if (this.pinStyle.showRing) {
        const ring = new THREE.Mesh(
          new THREE.CircleGeometry(ringR, 16),
          new THREE.MeshBasicMaterial({
            color: pinColorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.0005; // avoid z-fighting with sphere surface
        group.add(ring);
        userData.ring = ring;
      }

      // Hit sphere (invisible)
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(hitR, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.y = stalkH / 2;
      group.add(hit);

      const pos = latLngToVec3(pin.lat, pin.lng, GLOBE_RADIUS);
      group.position.copy(pos);
      group.lookAt(pos.clone().multiplyScalar(2));
      this.pinGroup.add(group);
    }
  }

  private applyPinColors(): void {
    const pinColorHex = toHexInt(this.colors.pin, 0xffffff);
    this.pinGroup.children.forEach((g) => {
      const data = g.userData as PinUserData;
      if (data.head) {
        const mat = data.head.material as THREE.MeshPhongMaterial;
        mat.color.setHex(pinColorHex);
        mat.needsUpdate = true;
      }
      if (data.ring) {
        const mat = data.ring.material as THREE.MeshBasicMaterial;
        mat.color.setHex(pinColorHex);
        mat.needsUpdate = true;
      }
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  Interactions
  // ──────────────────────────────────────────────────────────────

  private onPointerDown = (e: PointerEvent): void => {
    // Only left-button / primary presses start a drag.
    if (e.button !== undefined && e.button !== 0) return;
    this.isDragging = true;
    this.dragMoved = false;
    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.rotationVelocity = { x: 0, y: 0 };
    this.autoRotateActive = false;
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  };

  private onPointerUp = (): void => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.scheduleResume();
  };

  private scheduleResume(): void {
    if (!this.behaviour.autoRotate) return;
    if (this.behaviour.idleBehaviour === "stay") return;
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      this.autoRotateActive = true;
    }, INTERACT_RESUME_MS);
  }

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.dragMoved = true;
      this.globe.rotation.y += dx * 0.005;
      this.globe.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.globe.rotation.x + dy * 0.005)
      );
      this.rotationVelocity = { x: dy * 0.005, y: dx * 0.005 };
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.targetRotation = null;
      // Clear tooltip while dragging.
      if (this.hoveredPinId !== null) {
        this.hoveredPinId = null;
        this.onPinHover?.(null, e.clientX, e.clientY);
      }
      return;
    }

    this.updateHover(e.clientX, e.clientY);
  };

  private updateHover(clientX: number, clientY: number): void {
    if (!this.onPinHover && this.hoveredPinId === null) {
      // No consumer and nothing hovered — still set cursor.
      this.mount.style.cursor = "grab";
      return;
    }

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.pinGroup.children.forEach((g) => {
      g.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.isMesh) {
          (mesh.userData as { _pg?: THREE.Object3D })._pg = g;
          meshes.push(mesh);
        }
      });
    });
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const group = (hits[0].object.userData as { _pg: THREE.Object3D })._pg;
      const data = group.userData as PinUserData;
      if (this.hoveredPinId !== data.pinId) {
        this.hoveredPinId = data.pinId;
      }
      this.mount.style.cursor = "pointer";
      this.onPinHover?.(data.pin, clientX, clientY);
    } else {
      if (this.hoveredPinId !== null) {
        this.hoveredPinId = null;
        this.onPinHover?.(null, clientX, clientY);
      }
      this.mount.style.cursor = this.isDragging ? "grabbing" : "grab";
    }
  }

  private onClick = (e: MouseEvent): void => {
    if (this.dragMoved) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.pinGroup.children.forEach((g) => {
      g.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (mesh.isMesh) {
          (mesh.userData as { _pg?: THREE.Object3D })._pg = g;
          meshes.push(mesh);
        }
      });
    });
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const group = (hits[0].object.userData as { _pg: THREE.Object3D })._pg;
      const data = group.userData as PinUserData;
      this.onPinSelect?.(data.pin);
      this.focusPin(data.pin.id);
    } else {
      this.onPinSelect?.(null);
    }
  };

  private attachListeners(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("click", this.onClick);
    window.addEventListener("pointerup", this.onPointerUp);
    this.mount.style.cursor = "grab";
  }

  private detachListeners(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("click", this.onClick);
    window.removeEventListener("pointerup", this.onPointerUp);
  }

  // ──────────────────────────────────────────────────────────────
  //  Animation loop
  // ──────────────────────────────────────────────────────────────

  private animate(): void {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.animate);

    // Rotation animation
    if (this.targetRotation) {
      this.globe.rotation.x +=
        (this.targetRotation.x - this.globe.rotation.x) * 0.04;
      this.globe.rotation.y +=
        (this.targetRotation.y - this.globe.rotation.y) * 0.04;
      if (
        Math.abs(this.globe.rotation.x - this.targetRotation.x) < 0.001 &&
        Math.abs(this.globe.rotation.y - this.targetRotation.y) < 0.001
      ) {
        this.targetRotation = null;
      }
    } else if (
      this.behaviour.autoRotate &&
      this.autoRotateActive &&
      !this.isDragging
    ) {
      this.globe.rotation.y += ROTATION_SPEEDS[this.behaviour.rotationSpeed];
    } else if (!this.isDragging) {
      // Inertia after drag release
      this.rotationVelocity.x *= 0.95;
      this.rotationVelocity.y *= 0.95;
      this.globe.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.globe.rotation.x + this.rotationVelocity.x)
      );
      this.globe.rotation.y += this.rotationVelocity.y;
    }

    // Pulse animation — theme-agnostic.
    if (this.pinStyle.pulse) {
      const t = (performance.now() - this.startTime) / 1000;
      const scale = 1 + 0.15 * (Math.sin(t * 2 * Math.PI * 0.8) + 1); // 1.0 .. 1.3
      this.pinGroup.children.forEach((g) => {
        const head = (g.userData as PinUserData).head;
        if (head) head.scale.setScalar(scale);
      });
    } else {
      // Reset scale when pulse disabled.
      this.pinGroup.children.forEach((g) => {
        const head = (g.userData as PinUserData).head;
        if (head && head.scale.x !== 1) head.scale.setScalar(1);
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// ──────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────

function toHexInt(value: string, fallback: number): number {
  const trimmed = value.trim();
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (!match) return fallback;
  let h = match[1];
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return parseInt(h, 16);
}
