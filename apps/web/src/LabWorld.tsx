import { SPECIALIST_STATIONS } from "../../../packages/specialist-contracts";
import { useRoomRanking } from "./ranking/useRoomRanking";
import { RACK_POSITION } from "./sceneLayout";
import type { OtView } from "../../../packages/ot-contracts";
import type { DeviceId } from "../../../packages/network-contracts";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/addons/renderers/CSS3DRenderer.js";
import {
  ArrowLeft,
  VolumeX,
  DoorOpen,
  Server,
  Activity,
  Printer,
  Tv,
  ArrowUp,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import "./world.css";
import { loadSceneObjects, type SceneObject } from "./sceneCatalog";
import OsintInvestigationBoard from "./OsintInvestigationBoard";
import ReferenceLibrary from "./library/ReferenceLibrary";
import CryptoStorybook from "./crypto-storybook";
import ArtifactInteraction from "./ArtifactInteraction";
import type { ArtifactDocument, ArtifactPick } from "./artifactTypes";
import { createOfficeScene } from "./office/OfficeScene";
const TelevisionScreen = lazy(() => import("./ranking/TelevisionScreen"));
const SpecialistStation = lazy(() => import("./specialist/SpecialistStation"));
const OtApplication = lazy(() => import("./ot/OtApplication"));
const PrinterApplication = lazy(() => import("./printer/PrinterApplication"));
const WindowsDesktop = lazy(() => import("./WindowsDesktop"));
const MobileDesktop = lazy(() => import("./MobileDesktop"));
const RackNetworkPanel = lazy(() => import("./network/RackNetworkPanel"));
import {
  WALK_START,
  WALK_EYE_HEIGHT,
  WALK_FIELD_OF_VIEW,
  movePlayer,
} from "./roomNavigation";
import "@fontsource/caveat/500.css";
import {
  SCREEN_W,
  SCREEN_Y,
  SCREEN_Z,
  televisionFieldOfView,
  screenFieldOfView,
} from "./worldGeometry";

export type WorldView = string;
type Props = {
  view: WorldView;
  onView: (view: WorldView) => void;
  screen: ReactNode;
  onInvestigate: (id: string) => void;
};

export default function LabWorld({
  view,
  onView,
  screen,
  onInvestigate,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const fullscreenHost = useRef<HTMLDivElement>(null);
  const setScreenMode = useRef<((fullscreen: boolean) => void) | null>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [drawer, setDrawer] = useState<number | null>(null);
  const [pick, setPick] = useState<ArtifactPick>();
  const [doorOpen, setDoorOpen] = useState(false);
  const [rackDetail, setRackDetail] = useState(false);
  const ranking = useRoomRanking(view === "room" || view === "television");
  const [televisionReading, setTelevisionReading] = useState(true);
  const televisionRef = useRef<
    ReturnType<typeof createOfficeScene>["television"] | null
  >(null);
  const rankingDisplay = useRef(ranking.display);
  rankingDisplay.current = ranking.display;
  useEffect(() => {
    televisionRef.current?.setDisplay(ranking.display);
  }, [ranking.display]);
  useEffect(() => {
    if (view === "television") setTelevisionReading(true);
  }, [view]);
  useEffect(() => {
    const open = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (!/^network-(0[1-9]|10)$/.test(id || "")) return;
      setRackMission(id);
      setRackDevice(undefined);
      setRackPort(null);
      setRackRequest((n) => n + 1);
      setRackArchive(true);
    };
    window.addEventListener("ctf-network-open", open);
    return () => window.removeEventListener("ctf-network-open", open);
  }, []);
  const [specialistPanelOpen, setSpecialistPanelOpen] = useState(true);
  useEffect(() => {
    setSpecialistPanelOpen(true);
  }, [view]);
  const [otOpened, setOtOpened] = useState(false),
    [otPanelOpen, setOtPanelOpen] = useState(true);
  const otRef = useRef<ReturnType<typeof createOfficeScene>["ot"] | null>(null);
  useEffect(() => {
    const open = () => {
      setOtOpened(true);
      setOtPanelOpen(true);
      onView("ot");
    };
    const sync = (event: Event) =>
      otRef.current?.apply((event as CustomEvent<OtView>).detail);
    window.addEventListener("ctf-ot-open", open);
    window.addEventListener("ctf-ot-state", sync);
    return () => {
      window.removeEventListener("ctf-ot-open", open);
      window.removeEventListener("ctf-ot-state", sync);
    };
  }, [onView]);
  useEffect(() => {
    if (view === "ot") {
      setOtOpened(true);
      setOtPanelOpen(true);
    }
  }, [view]);
  const [printerOpened, setPrinterOpened] = useState(false);
  const [printerPanelOpen, setPrinterPanelOpen] = useState(true);
  const printerRef = useRef<
    ReturnType<typeof createOfficeScene>["printer"] | null
  >(null);
  useEffect(() => {
    const open = () => {
      setPrinterOpened(true);
      setPrinterPanelOpen(true);
      onView("printer");
    };
    const paper = (event: Event) =>
      printerRef.current?.setPrinted(
        Boolean((event as CustomEvent<{ printed: boolean }>).detail?.printed),
      );
    window.addEventListener("ctf-printer-open", open);
    window.addEventListener("ctf-printer-paper", paper);
    return () => {
      window.removeEventListener("ctf-printer-open", open);
      window.removeEventListener("ctf-printer-paper", paper);
    };
  }, [onView]);
  useEffect(() => {
    if (view === "printer") {
      setPrinterOpened(true);
      setPrinterPanelOpen(true);
    }
  }, [view]);
  const rackDetailRef = useRef(false);
  rackDetailRef.current = rackDetail;
  const [rackOpen, setRackOpen] = useState(false);
  const [rackMission, setRackMission] = useState<string>();
  const [rackDevice, setRackDevice] = useState<DeviceId | undefined>();
  const [rackRequest, setRackRequest] = useState(0);
  const [rackArchive, setRackArchive] = useState(false);
  const [openedDevices, setOpenedDevices] = useState({
    phone: false,
    laptop: false,
    rack: false,
  });
  useEffect(() => {
    if (view === "phone" || view === "laptop" || rackArchive) {
      setOpenedDevices((opened) => ({
        phone: opened.phone || view === "phone",
        laptop: opened.laptop || view === "laptop",
        rack: opened.rack || rackArchive,
      }));
    }
  }, [view, rackArchive]);
  const [rackPort, setRackPort] = useState<number | null>(null);
  const osintBoardRef = useRef<
    ReturnType<typeof createOfficeScene>["osintBoard"] | null
  >(null);
  const updateOsintProgress = useCallback(
    (solved: string[], available: string[]) => {
      osintBoardRef.current?.setCases(solved, available);
    },
    [],
  );
  const fixtureRef = useRef<
    ReturnType<typeof createOfficeScene>["fixtures"] | null
  >(null);
  const updateRackPorts = useCallback((ports: boolean[]) => {
    fixtureRef.current?.setPorts(ports);
  }, []);
  const player = useRef({ ...WALK_START });
  const touchMove = useRef({ forward: 0, strafe: 0 });
  const doorState = useRef(doorOpen);
  doorState.current = doorOpen;
  useEffect(() => {
    fixtureRef.current?.setDoor(doorOpen);
  }, [doorOpen]);
  useEffect(() => {
    fixtureRef.current?.setRack(rackOpen);
  }, [rackOpen]);
  const artifactsRef = useRef<
    ReturnType<typeof createOfficeScene>["artifacts"] | null
  >(null);
  useEffect(() => {
    artifactsRef.current?.setDrawer(drawer);
  }, [drawer]);
  const objectCatalog = useRef<SceneObject[]>([]);
  useEffect(() => {
    let active = true;
    void loadSceneObjects()
      .then((list) => {
        if (active) {
          setObjects(list);
          objectCatalog.current = list;
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const viewRef = useRef(view);
  viewRef.current = view;
  const select = useRef(onView);
  select.current = onView;
  useLayoutEffect(() => {
    if (mount) {
      setScreenMode.current?.(view === "computer");
      mount.inert = view !== "computer";
      mount.style.pointerEvents = view === "computer" ? "auto" : "none";
    }
  }, [mount, view]);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "world-webgl";
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080f14");
    scene.fog = new THREE.FogExp2("#080f14", 0.025);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(environment, 0.04);
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = 0.28;
    environment.dispose();
    pmrem.dispose();
    const cssScene = new THREE.Scene();
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.domElement.className = "world-css-layer";
    container.appendChild(cssRenderer.domElement);
    const element = document.createElement("div");
    element.className = "physical-monitor-surface";
    element.style.width = "1280px";
    element.style.height = "720px";
    element.inert = true;
    element.style.pointerEvents = "none";
    const cssScreen = new CSS3DObject(element);
    cssScreen.position.set(0, SCREEN_Y, SCREEN_Z + 0.015);
    cssScreen.scale.setScalar(SCREEN_W / 1280);
    cssScene.add(cssScreen);
    setMount(element);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 70);
    camera.position.set(WALK_START.x, WALK_EYE_HEIGHT, WALK_START.z);
    const look = camera.position
      .clone()
      .add(
        new THREE.Vector3(
          -Math.sin(WALK_START.yaw),
          WALK_START.pitch,
          -Math.cos(WALK_START.yaw),
        ),
      );
    camera.lookAt(look);
    let moving = true;
    const office = createOfficeScene(scene, {
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      requestRender: () => {
        moving = true;
        renderer.shadowMap.needsUpdate = true;
      },
    });
    const { targets, fixtures, artifacts } = office;
    fixtureRef.current = fixtures;
    televisionRef.current = office.television;
    office.television.setDisplay(rankingDisplay.current);
    printerRef.current = office.printer;
    otRef.current = office.ot;
    artifactsRef.current = artifacts;
    osintBoardRef.current = office.osintBoard;
    const cameraTarget = new THREE.Vector3(),
      lookTarget = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(4, 4);
    let currentHover: string | null = null;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let pointerDirty = true;
    const keys = new Set<string>();
    let width = 1,
      height = 1;
    let hidden = document.hidden;
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    const keyDown = (event: KeyboardEvent) => {
      if (
        viewRef.current !== "room" ||
        editable(event.target) ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      )
        return;
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(key)
      ) {
        event.preventDefault();
        keys.add(key);
        moving = true;
      }
    };
    const keyUp = (event: KeyboardEvent) =>
      keys.delete(event.key.toLowerCase());
    const releaseKeys = () => {
      keys.clear();
      touchMove.current = { forward: 0, strafe: 0 };
      dragging = false;
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", releaseKeys);
    let monitorTransform = "";
    function screenMode(fullscreen: boolean) {
      if (fullscreen) {
        if (!element.classList.contains("is-fullscreen"))
          monitorTransform = element.style.transform;
        if (cssScreen.parent) cssScene.remove(cssScreen);
        if (
          fullscreenHost.current &&
          element.parentElement !== fullscreenHost.current
        )
          fullscreenHost.current.appendChild(element);
        element.classList.add("is-fullscreen");
        element.style.transform = "none";
        element.style.width = width + "px";
        element.style.height = height + "px";
      } else {
        if (element.classList.contains("is-fullscreen"))
          element.style.transform = monitorTransform;
        element.classList.remove("is-fullscreen");
        const domWidth = Math.min(1280, Math.max(360, width - 70));
        element.style.width = domWidth + "px";
        element.style.height = (domWidth * 9) / 16 + "px";
        cssScreen.scale.setScalar(SCREEN_W / domWidth);
        if (cssScreen.parent !== cssScene) cssScene.add(cssScreen);
        cssRenderer.render(cssScene, camera);
      }
      moving = true;
    }
    setScreenMode.current = screenMode;
    function resize() {
      width = container!.clientWidth;
      height = container!.clientHeight;
      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      screenMode(viewRef.current === "computer");
      moving = true;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    function pointerMove(e: PointerEvent) {
      pointerDirty = true;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      if (dragging && viewRef.current === "room") {
        if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 5) {
          player.current.yaw -= (e.clientX - lastX) * 0.004;
          player.current.pitch = THREE.MathUtils.clamp(
            player.current.pitch - (e.clientY - lastY) * 0.003,
            -0.95,
            0.9,
          );
        }
        lastX = e.clientX;
        lastY = e.clientY;
        moving = true;
      }
    }
    function pointerDown(e: PointerEvent) {
      pointerMove(e);
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragging = true;
      renderer.domElement.setPointerCapture(e.pointerId);
    }
    function pointerUp(e: PointerEvent) {
      dragging = false;
      pointerMove(e);
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 8)
        return;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length) {
        let action: THREE.Object3D | null = hits[0].object;
        while (
          action &&
          action.userData.drawer === undefined &&
          action.userData.documentId === undefined &&
          action.userData.pageTurn === undefined &&
          action.userData.fixtureAction === undefined &&
          action.userData.port === undefined
        )
          action = action.parent;
        let o: THREE.Object3D | null = hits[0].object;
        while (o && !o.userData.device) o = o.parent;
        if (
          o?.userData.device === viewRef.current &&
          viewRef.current === "door"
        ) {
          if (!doorState.current || player.current.z < 5.5)
            setDoorOpen((current) => !current);
          return;
        }
        if (
          o?.userData.device === viewRef.current &&
          viewRef.current === "rack"
        ) {
          if (action?.userData.fixtureAction === "network-cases") {
            setRackMission("all");
            setRackDevice(undefined);
            setRackRequest((n) => n + 1);
            setRackArchive(true);
          } else if (action?.userData.port !== undefined) {
            setRackPort(action.userData.port);
            setRackMission(undefined);
            setRackDevice("sw1");
            setRackRequest((n) => n + 1);
            setRackArchive(true);
          } else if (action?.userData.fixtureAction === "network-device") {
            setRackMission(undefined);
            setRackDevice(action.userData.networkDevice);
            setRackPort(null);
            setRackRequest((n) => n + 1);
            setRackArchive(true);
          } else if (action?.userData.fixtureAction === "rack-door")
            setRackOpen((current) => !current);
          else {
            setRackDevice(undefined);
            setRackPort(null);
            setRackRequest((n) => n + 1);
            setRackArchive(true);
          }
          return;
        }
        if (
          ["osint-board", "library"].includes(o?.userData.device) &&
          action?.userData.documentId
        ) {
          setPick((current) => ({
            documentId: action!.userData.documentId,
            sequence: (current?.sequence ?? 0) + 1,
          }));
          select.current(o!.userData.device);
          return;
        }
        if (o?.userData.device === viewRef.current && action) {
          const data = action.userData;
          if (data.pageTurn !== undefined) {
            setPick((p) => ({
              turn: data.pageTurn,
              sequence: (p?.sequence ?? 0) + 1,
            }));
            return;
          }
          if (data.documentId) {
            setPick((p) => ({
              documentId: data.documentId,
              sequence: (p?.sequence ?? 0) + 1,
            }));
            return;
          }
          if (data.drawer !== undefined) {
            if (data.folder !== undefined) {
              if (artifacts.getDrawer() !== data.drawer) setDrawer(data.drawer);
              else
                setPick((p) => ({
                  drawer: data.drawer,
                  folder: data.folder,
                  sequence: (p?.sequence ?? 0) + 1,
                }));
            } else
              setDrawer((current) =>
                current === data.drawer ? null : data.drawer,
              );
            return;
          }
        }
        if (o?.userData.device) select.current(o.userData.device);
      }
    }
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", releaseKeys);
    const visibility = () => {
      hidden = document.hidden;
      if (hidden) releaseKeys();
      moving = true;
    };
    document.addEventListener("visibilitychange", visibility);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastRackDetail = false;
    let lastView = "";
    let lastTime = 0;
    renderer.setAnimationLoop((time) => {
      if (disposed || hidden || time - lastTime < 32) return;
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;
      const v = viewRef.current;
      // These interfaces cover the room completely; retain its GPU buffers for returning.
      if (v === "computer" || v === "phone" || v === "laptop") {
        releaseKeys();
        moving = true;
        return;
      }
      if (lastRackDetail !== rackDetailRef.current) {
        lastRackDetail = rackDetailRef.current;
        moving = true;
      }
      if (v !== lastView) {
        lastView = v;
        moving = true;
        renderer.shadowMap.needsUpdate = true;
        if (v !== "room") releaseKeys();
      }
      const forward =
        (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) +
        touchMove.current.forward;
      const strafe =
        (keys.has("d") ? 1 : 0) -
        (keys.has("a") ? 1 : 0) +
        touchMove.current.strafe;
      const turning =
        (keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0);
      if (v === "room" && (forward || strafe || turning)) {
        player.current.yaw += turning * dt * 1.6;
        Object.assign(
          player.current,
          movePlayer(
            player.current,
            player.current.yaw,
            forward,
            strafe,
            dt,
            doorState.current,
          ),
        );
        moving = true;
      }
      const objectsAnimating =
        artifacts.isAnimating() || fixtures.isAnimating();
      const sceneChanged =
        moving ||
        objectsAnimating ||
        (!reduced.matches && office.ot.isAnimating(v));
      if (!sceneChanged && !pointerDirty) return;
      if (objectsAnimating) renderer.shadowMap.needsUpdate = true;
      artifacts.update(dt, v);
      fixtures.update(dt);
      if (!reduced.matches) office.ot.update(dt, v);
      pointerDirty = false;
      if (artifacts.focus(v)) {
        const focus = artifacts.focus(v)!;
        cameraTarget.fromArray(focus.eye);
        lookTarget.fromArray(focus.look);
      } else if (objectCatalog.current.some((o) => o.id === v)) {
        const object = objectCatalog.current.find((o) => o.id === v)!;
        cameraTarget.fromArray(object.eye);
        lookTarget.fromArray(object.look);
        if (v === "rack" && rackDetailRef.current) {
          cameraTarget.set(-2.45, 3.18, RACK_POSITION[2]);
          lookTarget.set(-4.65, 3.05, RACK_POSITION[2]);
        }
      } else {
        const p = player.current;
        cameraTarget.set(p.x, WALK_EYE_HEIGHT, p.z);
        lookTarget
          .copy(cameraTarget)
          .add(
            new THREE.Vector3(
              -Math.sin(p.yaw) * Math.cos(p.pitch),
              Math.sin(p.pitch),
              -Math.cos(p.yaw) * Math.cos(p.pitch),
            ).multiplyScalar(4),
          );
      }
      const fieldOfView =
        v === "room"
          ? WALK_FIELD_OF_VIEW
          : v === "television"
            ? televisionFieldOfView(
                camera.aspect,
                cameraTarget.distanceTo(lookTarget),
              )
            : v === "soc"
              ? screenFieldOfView(
                  camera.aspect,
                  cameraTarget.distanceTo(lookTarget),
                  2.05,
                )
              : 45;
      if (camera.fov !== fieldOfView) {
        camera.fov = fieldOfView;
        camera.updateProjectionMatrix();
        moving = true;
      }
      const factor = reduced.matches ? 1 : 1 - Math.exp(-dt * 6);
      camera.position.lerp(cameraTarget, factor);
      look.lerp(lookTarget, factor);
      camera.lookAt(look);
      raycaster.setFromCamera(pointer, camera);
      const hits =
        viewRef.current === "computer"
          ? []
          : raycaster.intersectObjects(targets, true);
      let name: string | null = null;
      if (hits.length) {
        let o: THREE.Object3D | null = hits[0].object;
        while (o && !o.userData.device) o = o.parent;
        name = o?.userData.device ?? null;
      }
      if (name !== currentHover) {
        currentHover = name;
        setHovered(name);
        renderer.domElement.style.cursor = name
          ? "pointer"
          : dragging
            ? "grabbing"
            : "grab";
      }
      // Hover picking updates the cursor without redrawing an unchanged room.
      if (sceneChanged) {
        renderer.render(scene, camera);
        cssRenderer.render(cssScene, camera);
      }
      moving =
        camera.position.distanceToSquared(cameraTarget) > 0.00001 ||
        look.distanceToSquared(lookTarget) > 0.00001;
    });
    return () => {
      disposed = true;
      fixtureRef.current = null;
      televisionRef.current = null;
      printerRef.current = null;
      otRef.current = null;
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", releaseKeys);
      artifactsRef.current = null;
      osintBoardRef.current = null;
      setScreenMode.current = null;
      setMount(null);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointercancel", releaseKeys);
      office.dispose();
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      cssRenderer.domElement.remove();
      element.remove();
    };
  }, []);
  return (
    <main className={`lab-world view-${view}`}>
      <div
        ref={host}
        className="world-render-host"
        aria-label="Sala tridimensional con objetos, documentos y pistas interactivos"
      />
      {mount && createPortal(screen, mount)}
      {view === "television" && televisionReading && (
        <Suspense
          fallback={<p className="window-loading">Consultando televisor…</p>}
        >
          <TelevisionScreen
            display={ranking.display}
            refreshing={ranking.refreshing}
            onRefresh={() => void ranking.refresh()}
            onClose={() => setTelevisionReading(false)}
          />
        </Suspense>
      )}
      {view === "television" && !televisionReading && (
        <button
          className="television-screen-launch"
          onClick={() => setTelevisionReading(true)}
        >
          <Tv size={17} />
          Leer clasificación
        </button>
      )}
      <div
        className="ot-overlay"
        hidden={view !== "ot" || !otPanelOpen}
        inert={view !== "ot" || !otPanelOpen}
      >
        {otOpened && (
          <Suspense fallback={<p>Conectando HMI…</p>}>
            <OtApplication
              active={view === "ot"}
              onComputer={() => onView("computer")}
              onClose={() => setOtPanelOpen(false)}
            />
          </Suspense>
        )}
      </div>
      {view === "ot" && !otPanelOpen && (
        <button
          className="ot-screen-launch"
          onClick={() => setOtPanelOpen(true)}
        >
          <Activity size={18} />
          Usar pantalla HMI
        </button>
      )}
      <div
        className="printer-overlay"
        hidden={view !== "printer" || !printerPanelOpen}
        inert={view !== "printer" || !printerPanelOpen}
      >
        {printerOpened && (
          <Suspense fallback={<p>Cargando pantalla…</p>}>
            <PrinterApplication
              active={view === "printer"}
              onComputer={() => onView("computer")}
              onClose={() => setPrinterPanelOpen(false)}
            />
          </Suspense>
        )}
      </div>
      {view === "printer" && !printerPanelOpen && (
        <button
          className="printer-screen-launch"
          onClick={() => setPrinterPanelOpen(true)}
        >
          <Printer size={18} />
          Usar pantalla táctil
        </button>
      )}
      <div
        className="mobile-desktop-overlay"
        hidden={view !== "phone"}
        inert={view !== "phone"}
      >
        <Suspense
          fallback={<div className="world-loading">Abriendo teléfono…</div>}
        >
          {(openedDevices.phone || view === "phone") && (
            <MobileDesktop
              active={view === "phone"}
              onLeave={() => onView("room")}
            />
          )}
        </Suspense>
      </div>
      <div
        className="laptop-desktop-overlay"
        hidden={view !== "laptop"}
        inert={view !== "laptop"}
      >
        <Suspense
          fallback={<div className="world-loading">Abriendo portátil…</div>}
        >
          {(openedDevices.laptop || view === "laptop") && (
            <WindowsDesktop
              active={view === "laptop"}
              onLeave={() => onView("room")}
            />
          )}
        </Suspense>
      </div>
      <div
        ref={fullscreenHost}
        className="world-computer-overlay"
        inert={view !== "computer"}
        aria-hidden={view !== "computer"}
      />
      {failed && (
        <div className="world-fallback">
          <p>
            No se pudo activar WebGL. Puedes usar el equipo en modo accesible.
          </p>
          <div className="fallback-monitor">{screen}</div>
        </div>
      )}
      <header className="world-hud">
        <div className="world-event">
          <span>7</span>
          <div>
            <strong>Seventech</strong>
            <small>
              {view === "room"
                ? "WASD · Arrastra para mirar · Clic en los equipos"
                : "Capture the flag / Laboratorio"}
            </small>
          </div>
        </div>
        {view !== "room" && (
          <button className="world-back" onClick={() => onView("room")}>
            <ArrowLeft size={15} />
            Volver al escenario
          </button>
        )}
      </header>
      {view === "room" && hovered && (
        <span className="world-object-label">
          {objects.find((object) => object.id === hovered)?.name}
        </span>
      )}
      {view === "room" && (
        <>
          <div className="walk-controls" aria-label="Recorrer la sala">
            {[
              {
                label: "Avanzar",
                forward: 1,
                strafe: 0,
                icon: <ArrowUp size={18} />,
              },
              {
                label: "Izquierda",
                forward: 0,
                strafe: -1,
                icon: <ArrowLeft size={18} />,
              },
              {
                label: "Retroceder",
                forward: -1,
                strafe: 0,
                icon: <ArrowDown size={18} />,
              },
              {
                label: "Derecha",
                forward: 0,
                strafe: 1,
                icon: <ArrowRight size={18} />,
              },
            ].map((direction) => (
              <button
                key={direction.label}
                aria-label={direction.label}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  touchMove.current = {
                    forward: direction.forward,
                    strafe: direction.strafe,
                  };
                }}
                onPointerUp={() => {
                  touchMove.current = { forward: 0, strafe: 0 };
                }}
                onPointerCancel={() => {
                  touchMove.current = { forward: 0, strafe: 0 };
                }}
              >
                {direction.icon}
              </button>
            ))}
          </div>
        </>
      )}
      {view === "door" && (
        <div className="fixture-actions">
          <DoorOpen size={18} />
          <span>Acceso al laboratorio</span>
          <button
            onClick={() => {
              if (!doorOpen || player.current.z < 5.5)
                setDoorOpen((current) => !current);
            }}
          >
            {doorOpen ? "Cerrar puerta" : "Abrir puerta"}
          </button>
          <button onClick={() => onView("entrance")}>
            Salir del laboratorio
          </button>
        </div>
      )}
      <Suspense
        fallback={
          <div className="world-loading">Abriendo administración de red…</div>
        }
      >
        {(openedDevices.rack || rackArchive) && (
          <RackNetworkPanel
            active={view === "rack" && rackArchive}
            onPorts={updateRackPorts}
            initialMission={rackMission}
            initialDevice={rackDevice}
            initialPort={rackPort || undefined}
            sequence={rackRequest}
            onClose={() => setRackArchive(false)}
            onComputer={() => onView("computer")}
          />
        )}
      </Suspense>
      {view === "rack" && (
        <div className="fixture-actions">
          <Server size={18} />
          <span>
            {rackPort
              ? `ST-SW01 · Puerto ${String(rackPort).padStart(2, "0")}`
              : "ST-SW01 · Panel de parcheo"}
          </span>
          <button
            onClick={() => {
              setRackOpen((current) => !current);
              setRackPort(null);
            }}
          >
            {rackOpen ? "Cerrar gabinete" : "Abrir gabinete"}
          </button>
          <button onClick={() => setRackDetail((current) => !current)}>
            {rackDetail ? "Ver rack completo" : "Ver panel de conexiones"}
          </button>
          <button onClick={() => setRackArchive(true)}>Administrar red</button>
          <button onClick={() => onView("database-nas")}>NAS de datos</button>
          <button onClick={() => onView("devops-node")}>Servidor DevOps</button>
        </div>
      )}
      {view === "library" && (
        <ReferenceLibrary
          pick={pick}
          onComputer={() => onView("computer")}
          onCrypto={() => onView("crypto-book")}
        />
      )}
      {view === "osint-board" && (
        <OsintInvestigationBoard
          pick={pick}
          onProgress={updateOsintProgress}
          onComputer={() => onView("computer")}
          onInvestigate={onInvestigate}
        />
      )}
      {SPECIALIST_STATIONS.some((station) => station.id === view) &&
        specialistPanelOpen && (
          <SpecialistStation
            key={view}
            id={view}
            onInvestigate={onInvestigate}
            onClose={() => setSpecialistPanelOpen(false)}
            onComputer={() => onView("computer")}
          />
        )}
      {SPECIALIST_STATIONS.some((station) => station.id === view) &&
        !specialistPanelOpen && (
          <button
            className="specialist-launch"
            onClick={() => setSpecialistPanelOpen(true)}
          >
            Ver expedientes
          </button>
        )}
      {view === "crypto-book" && (
        <CryptoStorybook onComputer={() => onView("computer")} />
      )}
      {view !== "room" &&
        view !== "computer" &&
        view !== "laptop" &&
        view !== "phone" &&
        view !== "crypto-book" &&
        view !== "osint-board" &&
        view !== "library" &&
        view !== "television" &&
        !SPECIALIST_STATIONS.some((station) => station.id === view) &&
        objects.find((o) => o.id === view) && (
          <ArtifactInteraction
            object={objects.find((o) => o.id === view)!}
            onComputer={() => onView("computer")}
            drawer={drawer}
            pick={pick}
            onDrawer={(index) =>
              setDrawer((current) => (current === index ? null : index))
            }
            onDocument={(document: ArtifactDocument) =>
              artifactsRef.current?.showDocument(document)
            }
            onClosePaper={() => artifactsRef.current?.closePaper()}
            onInvestigate={onInvestigate}
          />
        )}
    </main>
  );
}
