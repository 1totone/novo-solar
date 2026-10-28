/**
 * Cena 3D da janela, das peças, do sol e da sombra (F3.7), com o Three.js; carregada só quando a aba
 * "Vista 3D" abre (import dinâmico em View3DPanel).
 *
 * A sombra no vidro não é a do Three.js: são os polígonos do núcleo (shadowPolygons), cuja área é o
 * percentual sombreado do cálculo. Referencial: o da fachada (x à direita de quem está dentro, y na
 * normal externa, z para cima) vira (X, Y, Z) = (x, z, −y) no Three.js, uma rotação (sem espelhar).
 * Vidro e sombra em cores chapadas (sem luz), para a vista de frente poder ser conferida pelos
 * pixels; as peças e a parede recebem a luz do sol.
 */
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Scene as ShadingScene } from '../../core/shading/geometry';
import type { FacadeVector } from '../../core/shading/shadedFraction';

export type ViewMode = 'perspective' | 'front';

export interface Scene3DInput {
  scene: ShadingScene;
  setback: number;
  /** Direção do sol no referencial da fachada; null com o sol abaixo do horizonte. */
  sun: FacadeVector | null;
  /** Polígonos da sombra no vidro, [x, z] (vazio sem sol na janela). */
  shadows: [number, number][][];
  view: ViewMode;
}

/** Cores chapadas do vidro e da sombra (a vista de frente é conferida por elas). */
export const GLASS_COLOR = '#9ecae1';
export const SHADOW_COLOR = '#08306b';

const toThree = (x: number, y: number, z: number) => new Vector3(x, z, -y);

/** Malha de um polígono plano dado no referencial da fachada (placas convexas). */
function polygonMesh(
  points: readonly (readonly [number, number, number])[],
  material: MeshLambertMaterial,
) {
  const geometry = new BufferGeometry();
  const v = points.map(([x, y, z]) => toThree(x, y, z));
  const positions: number[] = [];
  for (let i = 1; i + 1 < v.length; i++) {
    for (const p of [v[0]!, v[i]!, v[i + 1]!]) positions.push(p.x, p.y, p.z);
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return new Mesh(geometry, material);
}

export class Scene3D {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly perspective = new PerspectiveCamera(40, 1, 0.01, 200);
  private readonly front = new OrthographicCamera(-1, 1, 1, -1, 0.01, 200);
  private readonly controls: OrbitControls;
  private readonly content = new Group();
  private readonly sunLight = new DirectionalLight(0xffffff, 1.6);
  private view: ViewMode = 'perspective';
  private width = 1;
  private height = 1;
  private windowSize = { width: 1, height: 1 };
  private framed = '';
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // preserveDrawingBuffer: a imagem continua no canvas para a impressão e as capturas.
    this.renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    this.scene.background = new Color('#ffffff');
    this.scene.add(new AmbientLight(0xffffff, 0.9));
    this.scene.add(this.sunLight);
    this.scene.add(this.content);
    this.controls = new OrbitControls(this.perspective, canvas);
    this.controls.enableDamping = false;
    this.controls.addEventListener('change', () => this.render());
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.perspective.aspect = this.width / this.height;
    this.perspective.updateProjectionMatrix();
    this.frameFront();
    this.render();
  }

  update(input: Scene3DInput) {
    const { scene, setback, sun, shadows } = input;
    const W = scene.width;
    const H = scene.height;
    this.windowSize = { width: W, height: H };
    this.view = input.view;
    this.controls.enabled = this.view === 'perspective';
    for (const child of [...this.content.children]) {
      this.content.remove(child);
      child.traverse((o) => {
        if (o instanceof Mesh || o instanceof Line) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
    }
    const m = Math.max(W, H);
    // Parede: face externa no plano y = recuo, com o vão da janela.
    const wall = new Shape();
    wall.moveTo(-m, -m);
    wall.lineTo(W + m, -m);
    wall.lineTo(W + m, H + m);
    wall.lineTo(-m, H + m);
    wall.lineTo(-m, -m);
    const hole = new Shape();
    hole.moveTo(0, 0);
    hole.lineTo(0, H);
    hole.lineTo(W, H);
    hole.lineTo(W, 0);
    hole.lineTo(0, 0);
    wall.holes.push(hole);
    const wallMesh = new Mesh(
      new ShapeGeometry(wall),
      new MeshLambertMaterial({ color: '#d8dee4', side: DoubleSide }),
    );
    // ShapeGeometry fica no plano XY (X = x, Y = z): basta afastar para Z = −recuo.
    wallMesh.position.set(0, 0, -setback);
    this.content.add(wallMesh);
    // Vidro e sombra: cores chapadas, sem luz.
    const glass = new Mesh(
      new ShapeGeometry(hole),
      new MeshBasicMaterial({ color: GLASS_COLOR, side: DoubleSide }),
    );
    this.content.add(glass);
    const shadowMaterial = new MeshBasicMaterial({ color: SHADOW_COLOR, side: DoubleSide });
    for (const poly of shadows) {
      const shape = new Shape();
      poly.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
      const mesh = new Mesh(new ShapeGeometry(shape), shadowMaterial);
      mesh.position.set(0, 0, -0.0005 * m);
      this.content.add(mesh);
    }
    // Peças e revestimentos do vão: as mesmas placas do cálculo.
    const pieceMaterial = new MeshLambertMaterial({ color: '#57606a', side: DoubleSide });
    for (const plate of scene.plates) this.content.add(polygonMesh(plate, pieceMaterial));
    // Sol: luz na direção do sol e uma esfera longe, ligada ao meio da janela.
    if (sun) {
      const dir = toThree(sun.x, sun.y, sun.z).normalize();
      const center = toThree(W / 2, 0, H / 2);
      const far = center.clone().add(dir.clone().multiplyScalar(2.2 * m));
      this.sunLight.position.copy(center.clone().add(dir.clone().multiplyScalar(10 * m)));
      this.sunLight.target.position.copy(center);
      this.sunLight.intensity = 1.6;
      const sphere = new Mesh(
        new SphereGeometry(0.06 * m, 24, 16),
        new MeshBasicMaterial({ color: '#f6b100' }),
      );
      sphere.position.copy(far);
      this.content.add(sphere);
      const ray = new BufferGeometry().setFromPoints([center, far]);
      this.content.add(new Line(ray, new LineBasicMaterial({ color: '#d4a72c' })));
    } else {
      this.sunLight.intensity = 0;
    }
    this.scene.add(this.sunLight.target);
    // Câmera da perspectiva enquadrada uma vez por janela (depois, o usuário gira à vontade).
    const key = `${W}x${H}`;
    if (this.framed !== key) {
      this.framed = key;
      const target = toThree(W / 2, 0, H / 2);
      this.perspective.position.copy(target.clone().add(new Vector3(-1.6 * m, 1.1 * m, -2.6 * m)));
      this.controls.target.copy(target);
      this.controls.update();
    }
    this.frameFront();
    this.render();
  }

  /** Vista de frente: ortográfica, olhando para a fachada de fora, com 10% de folga. */
  private frameFront() {
    const { width: W, height: H } = this.windowSize;
    const aspect = this.width / this.height;
    let halfW = 0.55 * W;
    let halfH = 0.55 * H;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    const c = toThree(W / 2, 0, H / 2);
    this.front.left = -halfW;
    this.front.right = halfW;
    this.front.top = halfH;
    this.front.bottom = -halfH;
    this.front.position.set(c.x, c.y, c.z - 10 * Math.max(W, H));
    this.front.up.set(0, 1, 0);
    this.front.lookAt(c);
    this.front.updateProjectionMatrix();
  }

  /** Retângulo do vidro na tela (px CSS, relativo ao canvas), na vista de frente. */
  windowRect(): [number, number, number, number] {
    const { width: W, height: H } = this.windowSize;
    const corners = [toThree(0, 0, 0), toThree(W, 0, H)].map((p) => p.project(this.front));
    const xs = corners.map((p) => ((p.x + 1) / 2) * this.width);
    const ys = corners.map((p) => ((1 - p.y) / 2) * this.height);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  render() {
    this.renderer.render(this.scene, this.view === 'front' ? this.front : this.perspective);
    this.canvas.dataset.windowRect = this.windowRect()
      .map((v) => v.toFixed(1))
      .join(',');
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
  }
}
