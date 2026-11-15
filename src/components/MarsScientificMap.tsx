import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'ol/ol.css';
import Feature from 'ol/Feature';
import OLMap from 'ol/Map';
import View from 'ol/View';
import ScaleLine from 'ol/control/ScaleLine';
import { defaults as defaultControls } from 'ol/control/defaults';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { fromExtent } from 'ol/geom/Polygon';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import WMTS from 'ol/source/WMTS';
import XYZ from 'ol/source/XYZ';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Frame,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  approxMetersPerPixel,
  clampLatitude,
  createMarsWmtsTileGrid,
  extentsIntersect,
  formatMarsLatLonDetailed,
  getMarsProjection,
  isPointInExtent,
  JEZERO_CTX_EXTENT,
  JEZERO_HIRISE_EXTENT,
  JEZERO_MAP_CENTER,
  MARS_BASE_LAYERS,
  MARS_OVERLAY_LAYERS,
  MARS_WORLD_EXTENT,
  MarsBaseLayerId,
  MOLA_CLRSHADE_EXTENT,
  normalizeLongitude,
  THEMIS_CONTROLLED_EXTENT,
} from '../utils/marsMapLayers';
import {
  PlannerWaypoint,
  splitAntimeridianPolylines,
} from '../utils/marsRouteMath';

export interface SelectedMapPoint {
  lat: number;
  lon: number;
}

export interface MapJumpRequest {
  lat: number;
  lon: number;
  zoom: number;
  seq: number;
}

export interface OverlayState {
  enabled: boolean;
  opacity: number;
}

export interface MarsScientificMapProps {
  baseLayerId: MarsBaseLayerId;
  overlays: {
    hirise: OverlayState;
    mola: OverlayState;
    themisDay: OverlayState;
  };
  selectedPoint: SelectedMapPoint | null;
  jumpRequest: MapJumpRequest | null;
  onSelectPoint: (point: SelectedMapPoint) => void;
  onViewChange?: (view: {
    lat: number;
    lon: number;
    zoom: number;
    extent: [number, number, number, number];
  }) => void;
  plannerWaypoints?: PlannerWaypoint[];
  addWaypointMode?: boolean;
  activeWaypointId?: string | null;
  onAddWaypoint?: (point: SelectedMapPoint) => void;
  onSelectWaypoint?: (waypointId: string) => void;
  onToggleAddWaypointMode?: () => void;
  heightClassName?: string;
}

function buildWmtsLayer(
  id: string,
  layerIdentifier: string,
  urlTemplate: string,
  maxZoom: number,
  extent: [number, number, number, number],
  visible: boolean,
  opacity: number,
  zIndex: number,
  wrapX: boolean
): TileLayer<WMTS> {
  const projection = getMarsProjection();
  const tileGrid = createMarsWmtsTileGrid(maxZoom);

  return new TileLayer({
    properties: { id },
    extent,
    visible,
    opacity,
    zIndex,
    preload: 1,
    source: new WMTS({
      url: urlTemplate,
      layer: layerIdentifier,
      matrixSet: 'default028mm',
      style: 'default',
      requestEncoding: 'REST',
      projection,
      tileGrid,
      crossOrigin: 'anonymous',
      wrapX,
    }),
  });
}

function buildXyzLayer(
  id: string,
  urlTemplate: string,
  maxZoom: number,
  extent: [number, number, number, number],
  visible: boolean,
  opacity: number,
  zIndex: number
): TileLayer<XYZ> {
  const projection = getMarsProjection();
  const tileGrid = createMarsWmtsTileGrid(maxZoom);

  return new TileLayer({
    properties: { id },
    extent,
    visible,
    opacity,
    zIndex,
    preload: 1,
    source: new XYZ({
      url: urlTemplate,
      projection,
      tileGrid,
      crossOrigin: 'anonymous',
      wrapX: true,
    }),
  });
}

export function MarsScientificMap({
  baseLayerId,
  overlays,
  selectedPoint,
  jumpRequest,
  onSelectPoint,
  onViewChange,
  plannerWaypoints,
  addWaypointMode = false,
  activeWaypointId = null,
  onAddWaypoint,
  onSelectWaypoint,
  onToggleAddWaypointMode,
  heightClassName,
}: MarsScientificMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapTargetRef = useRef<HTMLDivElement | null>(null);
  const scaleTargetRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<OLMap | null>(null);
  const layersRef = useRef<{
    ctxGlobal: TileLayer<XYZ>;
    viking: TileLayer<WMTS>;
    molaBase: TileLayer<WMTS>;
    themisDayBase: TileLayer<WMTS>;
    themisNightBase: TileLayer<WMTS>;
    ctxJezero: TileLayer<WMTS>;
    molaOverlay: TileLayer<WMTS>;
    themisDayOverlay: TileLayer<WMTS>;
    hiriseOverlay: TileLayer<WMTS>;
    footprintLayer: VectorLayer<VectorSource>;
    markerLayer: VectorLayer<VectorSource>;
    routeLayer: VectorLayer<VectorSource>;
    waypointLayer: VectorLayer<VectorSource>;
  } | null>(null);
  const selectedFeatureRef = useRef<Feature<Point> | null>(null);
  const jezeroMarkerRef = useRef<Feature<Point> | null>(null);

  const onSelectPointRef = useRef(onSelectPoint);
  onSelectPointRef.current = onSelectPoint;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const addWaypointModeRef = useRef(addWaypointMode);
  addWaypointModeRef.current = addWaypointMode;
  const onAddWaypointRef = useRef(onAddWaypoint);
  onAddWaypointRef.current = onAddWaypoint;
  const onSelectWaypointRef = useRef(onSelectWaypoint);
  onSelectWaypointRef.current = onSelectWaypoint;
  const hasPlannerWaypointsRef = useRef(Boolean(plannerWaypoints && plannerWaypoints.length > 0));
  hasPlannerWaypointsRef.current = Boolean(plannerWaypoints && plannerWaypoints.length > 0);

  const [pointerCoords, setPointerCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [viewState, setViewState] = useState<{
    lat: number;
    lon: number;
    zoom: number;
    extent: [number, number, number, number];
  }>({
    lat: JEZERO_MAP_CENTER.lat,
    lon: JEZERO_MAP_CENTER.lon,
    zoom: 9.2,
    extent: [76.7, 17.9, 78.1, 18.9],
  });
  const [showFootprints, setShowFootprints] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [pendingTiles, setPendingTiles] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);

  // Sync native fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      setTimeout(() => mapRef.current?.updateSize(), 80);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Initialize OpenLayers map once
  useEffect(() => {
    const targetEl = mapTargetRef.current;
    const scaleEl = scaleTargetRef.current;
    if (!targetEl || !scaleEl) return;

    const projection = getMarsProjection();

    const ctxGlobal = buildXyzLayer(
      'ctx-global',
      MARS_BASE_LAYERS['ctx-global'].tileUrlTemplate,
      MARS_BASE_LAYERS['ctx-global'].maxZoom,
      MARS_WORLD_EXTENT,
      true,
      1,
      0
    );
    const viking = buildWmtsLayer(
      'viking-color',
      MARS_BASE_LAYERS['viking-color'].wmtsIdentifier,
      MARS_BASE_LAYERS['viking-color'].tileUrlTemplate,
      MARS_BASE_LAYERS['viking-color'].maxZoom,
      MARS_WORLD_EXTENT,
      false,
      1,
      0,
      true
    );
    const molaBase = buildWmtsLayer(
      'mola-clrshade',
      MARS_BASE_LAYERS['mola-clrshade'].wmtsIdentifier,
      MARS_BASE_LAYERS['mola-clrshade'].tileUrlTemplate,
      MARS_BASE_LAYERS['mola-clrshade'].maxZoom,
      MOLA_CLRSHADE_EXTENT,
      false,
      1,
      0,
      true
    );
    const themisDayBase = buildWmtsLayer(
      'themis-day-ir',
      MARS_BASE_LAYERS['themis-day-ir'].wmtsIdentifier,
      MARS_BASE_LAYERS['themis-day-ir'].tileUrlTemplate,
      MARS_BASE_LAYERS['themis-day-ir'].maxZoom,
      THEMIS_CONTROLLED_EXTENT,
      false,
      1,
      0,
      true
    );
    const themisNightBase = buildWmtsLayer(
      'themis-night-ir',
      MARS_BASE_LAYERS['themis-night-ir'].wmtsIdentifier,
      MARS_BASE_LAYERS['themis-night-ir'].tileUrlTemplate,
      MARS_BASE_LAYERS['themis-night-ir'].maxZoom,
      THEMIS_CONTROLLED_EXTENT,
      false,
      1,
      0,
      true
    );
    const ctxJezero = buildWmtsLayer(
      'ctx-jezero',
      MARS_BASE_LAYERS['ctx-jezero'].wmtsIdentifier,
      MARS_BASE_LAYERS['ctx-jezero'].tileUrlTemplate,
      MARS_BASE_LAYERS['ctx-jezero'].maxZoom,
      JEZERO_CTX_EXTENT,
      true,
      1,
      1,
      false
    );

    const molaOverlay = buildWmtsLayer(
      'mola-overlay',
      MARS_OVERLAY_LAYERS['mola-overlay'].wmtsIdentifier,
      MARS_OVERLAY_LAYERS['mola-overlay'].tileUrlTemplate,
      MARS_OVERLAY_LAYERS['mola-overlay'].maxZoom,
      MOLA_CLRSHADE_EXTENT,
      false,
      0.45,
      2,
      true
    );
    const themisDayOverlay = buildWmtsLayer(
      'themis-day-overlay',
      MARS_OVERLAY_LAYERS['themis-day-overlay'].wmtsIdentifier,
      MARS_OVERLAY_LAYERS['themis-day-overlay'].tileUrlTemplate,
      MARS_OVERLAY_LAYERS['themis-day-overlay'].maxZoom,
      THEMIS_CONTROLLED_EXTENT,
      false,
      0.5,
      3,
      true
    );
    const hiriseOverlay = buildWmtsLayer(
      'hirise-jezero',
      MARS_OVERLAY_LAYERS['hirise-jezero'].wmtsIdentifier,
      MARS_OVERLAY_LAYERS['hirise-jezero'].tileUrlTemplate,
      MARS_OVERLAY_LAYERS['hirise-jezero'].maxZoom,
      JEZERO_HIRISE_EXTENT,
      true,
      1,
      4,
      false
    );

    // Coverage footprints layer (CTX Jezero 6m + HiRISE Jezero 25cm)
    const ctxFootprintFeature = new Feature({
      geometry: fromExtent(JEZERO_CTX_EXTENT),
      label: 'Jezero CTX 6 m',
    });
    ctxFootprintFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: 'rgba(229, 169, 82, 0.72)',
          width: 1.5,
          lineDash: [6, 4],
        }),
        fill: new Fill({
          color: 'rgba(229, 169, 82, 0.02)',
        }),
      })
    );

    const hiriseFootprintFeature = new Feature({
      geometry: fromExtent(JEZERO_HIRISE_EXTENT),
      label: 'Jezero HiRISE 25 cm',
    });
    hiriseFootprintFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: 'rgba(217, 83, 47, 0.9)',
          width: 1.75,
          lineDash: [4, 4],
        }),
        fill: new Fill({
          color: 'rgba(217, 83, 47, 0.03)',
        }),
      })
    );

    const footprintLayer = new VectorLayer({
      zIndex: 10,
      visible: true,
      source: new VectorSource({
        features: [ctxFootprintFeature, hiriseFootprintFeature],
      }),
    });

    // Reference + Selected point markers layer
    const jezeroFeature = new Feature({
      geometry: new Point([JEZERO_MAP_CENTER.lon, JEZERO_MAP_CENTER.lat]),
    });
    jezeroFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: 'rgba(217, 83, 47, 0.25)' }),
          stroke: new Stroke({ color: '#F39C82', width: 1.5 }),
        }),
        text: new Text({
          text: 'Jezero Crater (18.4° N, 77.4° E)',
          offsetY: -14,
          font: '500 11px "IBM Plex Sans", sans-serif',
          fill: new Fill({ color: '#E6E8EC' }),
          stroke: new Stroke({ color: '#090A0D', width: 3 }),
        }),
      })
    );
    jezeroMarkerRef.current = jezeroFeature;

    const selectedFeature = new Feature({
      geometry: new Point([JEZERO_MAP_CENTER.lon, JEZERO_MAP_CENTER.lat]),
    });
    selectedFeature.setStyle(new Style({}));
    selectedFeatureRef.current = selectedFeature;

    const markerLayer = new VectorLayer({
      zIndex: 11,
      source: new VectorSource({
        features: [jezeroFeature, selectedFeature],
      }),
    });

    const routeLayer = new VectorLayer({
      zIndex: 12,
      source: new VectorSource(),
    });

    const waypointLayer = new VectorLayer({
      zIndex: 13,
      source: new VectorSource(),
    });

    const allTileLayers = [
      ctxGlobal,
      viking,
      molaBase,
      themisDayBase,
      themisNightBase,
      ctxJezero,
      molaOverlay,
      themisDayOverlay,
      hiriseOverlay,
    ];

    let activeLoadingCount = 0;
    const unbindListeners: Array<() => void> = [];

    allTileLayers.forEach((layer) => {
      const source = layer.getSource();
      if (!source) return;

      const onStart = () => {
        activeLoadingCount++;
        setPendingTiles(activeLoadingCount);
      };
      const onEnd = () => {
        activeLoadingCount = Math.max(0, activeLoadingCount - 1);
        setPendingTiles(activeLoadingCount);
      };
      const onError = () => {
        activeLoadingCount = Math.max(0, activeLoadingCount - 1);
        setPendingTiles(activeLoadingCount);
        setTileErrors((prev) => prev + 1);
      };

      source.on('tileloadstart', onStart);
      source.on('tileloadend', onEnd);
      source.on('tileloaderror', onError);

      unbindListeners.push(() => {
        source.un('tileloadstart', onStart);
        source.un('tileloadend', onEnd);
        source.un('tileloaderror', onError);
      });
    });

    const scaleControl = new ScaleLine({
      target: scaleEl,
      units: 'metric',
      minWidth: 88,
      maxWidth: 168,
    });

    const initialCenter = jumpRequest
      ? [jumpRequest.lon, jumpRequest.lat]
      : [JEZERO_MAP_CENTER.lon, JEZERO_MAP_CENTER.lat];
    const initialZoom = jumpRequest ? jumpRequest.zoom : 9.2;

    const map = new OLMap({
      target: targetEl,
      layers: [...allTileLayers, footprintLayer, markerLayer, routeLayer, waypointLayer],
      controls: defaultControls({
        attribution: false,
        zoom: false,
        rotate: false,
      }).extend([scaleControl]),
      interactions: defaultInteractions({
        altShiftDragRotate: false,
        pinchRotate: false,
      }),
      view: new View({
        projection,
        center: initialCenter,
        zoom: initialZoom,
        minZoom: 1,
        maxZoom: 17,
        extent: MARS_WORLD_EXTENT,
        constrainOnlyCenter: true,
      }),
    });

    layersRef.current = {
      ctxGlobal,
      viking,
      molaBase,
      themisDayBase,
      themisNightBase,
      ctxJezero,
      molaOverlay,
      themisDayOverlay,
      hiriseOverlay,
      footprintLayer,
      markerLayer,
      routeLayer,
      waypointLayer,
    };
    mapRef.current = map;

    const emitViewState = () => {
      const view = map.getView();
      const center = view.getCenter();
      const zoom = view.getZoom() ?? 9.2;
      const size = map.getSize();
      if (!center || !size) return;
      const extent = view.calculateExtent(size) as [number, number, number, number];
      const next = {
        lat: clampLatitude(center[1]),
        lon: normalizeLongitude(center[0]),
        zoom,
        extent,
      };
      setViewState(next);
      onViewChangeRef.current?.(next);

      // Hide static Jezero label once deeply zoomed OR when planner waypoints are plotted
      if (jezeroMarkerRef.current) {
        jezeroMarkerRef.current.setStyle(
          zoom > 12.2 || hasPlannerWaypointsRef.current
            ? new Style({})
            : new Style({
                image: new CircleStyle({
                  radius: 5,
                  fill: new Fill({ color: 'rgba(217, 83, 47, 0.25)' }),
                  stroke: new Stroke({ color: '#F39C82', width: 1.5 }),
                }),
                text: new Text({
                  text: 'Jezero Crater (18.4° N, 77.4° E)',
                  offsetY: -14,
                  font: '500 11px "IBM Plex Sans", sans-serif',
                  fill: new Fill({ color: '#E6E8EC' }),
                  stroke: new Stroke({ color: '#090A0D', width: 3 }),
                }),
              })
        );
      }
    };

    map.on('moveend', emitViewState);
    emitViewState();

    map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const coord = evt.coordinate;
      if (!coord) return;
      setPointerCoords({
        lat: clampLatitude(coord[1]),
        lon: normalizeLongitude(coord[0]),
      });
    });

    map.on('singleclick', (evt) => {
      const coord = evt.coordinate;
      if (!coord) return;
      const point = {
        lat: clampLatitude(coord[1]),
        lon: normalizeLongitude(coord[0]),
      };

      if (addWaypointModeRef.current && onAddWaypointRef.current) {
        onAddWaypointRef.current(point);
        return;
      }

      if (onSelectWaypointRef.current) {
        let hitWaypointId: string | null = null;
        map.forEachFeatureAtPixel(
          evt.pixel,
          (feat) => {
            const id = feat.get('waypointId');
            if (typeof id === 'string') {
              hitWaypointId = id;
              return true;
            }
            return false;
          },
          { hitTolerance: 6 }
        );
        if (hitWaypointId) {
          onSelectWaypointRef.current(hitWaypointId);
        }
      }

      onSelectPointRef.current(point);
    });

    const handleMouseLeave = () => setPointerCoords(null);
    targetEl.addEventListener('mouseleave', handleMouseLeave);

    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
    });
    resizeObserver.observe(targetEl);

    return () => {
      resizeObserver.disconnect();
      targetEl.removeEventListener('mouseleave', handleMouseLeave);
      unbindListeners.forEach((fn) => fn());
      map.setTarget(undefined);
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronize layer visibility and opacity
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;

    setTileErrors(0);

    layers.ctxGlobal.setVisible(
      baseLayerId === 'ctx-global' || baseLayerId === 'ctx-jezero'
    );
    layers.ctxJezero.setVisible(baseLayerId === 'ctx-jezero');
    layers.viking.setVisible(baseLayerId === 'viking-color');
    layers.molaBase.setVisible(baseLayerId === 'mola-clrshade');
    layers.themisDayBase.setVisible(baseLayerId === 'themis-day-ir');
    layers.themisNightBase.setVisible(baseLayerId === 'themis-night-ir');

    layers.molaOverlay.setVisible(overlays.mola.enabled && baseLayerId !== 'mola-clrshade');
    layers.molaOverlay.setOpacity(overlays.mola.opacity);

    layers.themisDayOverlay.setVisible(
      overlays.themisDay.enabled && baseLayerId !== 'themis-day-ir'
    );
    layers.themisDayOverlay.setOpacity(overlays.themisDay.opacity);

    layers.hiriseOverlay.setVisible(overlays.hirise.enabled);
    layers.hiriseOverlay.setOpacity(overlays.hirise.opacity);
  }, [baseLayerId, overlays]);

  // Synchronize coverage footprint boxes
  useEffect(() => {
    if (layersRef.current) {
      layersRef.current.footprintLayer.setVisible(showFootprints);
    }
  }, [showFootprints]);

  // Synchronize selected point crosshair marker
  useEffect(() => {
    const feat = selectedFeatureRef.current;
    if (!feat) return;
    if (!selectedPoint) {
      feat.setStyle(new Style({}));
      return;
    }
    const atJezeroRef =
      Math.abs(selectedPoint.lat - JEZERO_MAP_CENTER.lat) < 0.002 &&
      Math.abs(selectedPoint.lon - JEZERO_MAP_CENTER.lon) < 0.002;
    feat.setGeometry(new Point([selectedPoint.lon, selectedPoint.lat]));
    feat.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color: 'rgba(243, 156, 130, 0.2)' }),
          stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
        }),
        text: atJezeroRef
          ? undefined
          : new Text({
              text: formatMarsLatLonDetailed(selectedPoint.lat, selectedPoint.lon),
              offsetY: 18,
              font: '500 11px "IBM Plex Mono", monospace',
              fill: new Fill({ color: '#FFFFFF' }),
              backgroundFill: new Fill({ color: 'rgba(9, 10, 13, 0.85)' }),
              padding: [2, 5, 2, 5],
            }),
      })
    );
  }, [selectedPoint]);

  // Synchronize Marswalk Planner route polylines and numbered Start/Intermediate/Destination markers
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;

    const routeSource = layers.routeLayer.getSource();
    const waypointSource = layers.waypointLayer.getSource();
    if (!routeSource || !waypointSource) return;

    routeSource.clear();
    waypointSource.clear();

    if (jezeroMarkerRef.current) {
      const currentZoom = mapRef.current?.getView().getZoom() ?? 9.2;
      const hideJezero =
        currentZoom > 12.2 || Boolean(plannerWaypoints && plannerWaypoints.length > 0);
      jezeroMarkerRef.current.setStyle(
        hideJezero
          ? new Style({})
          : new Style({
              image: new CircleStyle({
                radius: 5,
                fill: new Fill({ color: 'rgba(217, 83, 47, 0.25)' }),
                stroke: new Stroke({ color: '#F39C82', width: 1.5 }),
              }),
              text: new Text({
                text: 'Jezero Crater (18.4° N, 77.4° E)',
                offsetY: -14,
                font: '500 11px "IBM Plex Sans", sans-serif',
                fill: new Fill({ color: '#E6E8EC' }),
                stroke: new Stroke({ color: '#090A0D', width: 3 }),
              }),
            })
      );
    }

    if (!plannerWaypoints || plannerWaypoints.length === 0) return;

    const chains = splitAntimeridianPolylines(plannerWaypoints);
    for (const chain of chains) {
      const lineFeat = new Feature({
        geometry: new LineString(chain),
      });
      lineFeat.setStyle([
        new Style({
          stroke: new Stroke({
            color: 'rgba(9, 10, 13, 0.85)',
            width: 5,
          }),
        }),
        new Style({
          stroke: new Stroke({
            color: '#F59E0B',
            width: 2.5,
          }),
        }),
      ]);
      routeSource.addFeature(lineFeat);
    }

    const total = plannerWaypoints.length;
    plannerWaypoints.forEach((wp, idx) => {
      const isStart = idx === 0;
      const isEnd = total >= 2 && idx === total - 1;
      const isActive = activeWaypointId === wp.id;

      const fillColor = isStart
        ? '#059669'
        : isEnd
        ? '#D9532F'
        : '#161920';
      const strokeColor = isActive
        ? '#FFFFFF'
        : isStart
        ? '#6EE7B7'
        : isEnd
        ? '#FCD34D'
        : '#E5A952';

      const roleCaption = isStart ? 'START' : isEnd ? 'DEST' : '';

      const styles: Style[] = [];
      if (isActive) {
        styles.push(
          new Style({
            image: new CircleStyle({
              radius: 15,
              fill: new Fill({ color: 'rgba(255, 255, 255, 0.12)' }),
              stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }),
            }),
          })
        );
      }

      styles.push(
        new Style({
          image: new CircleStyle({
            radius: isStart || isEnd ? 11 : 10,
            fill: new Fill({ color: fillColor }),
            stroke: new Stroke({ color: strokeColor, width: 2 }),
          }),
          text: new Text({
            text: String(idx + 1),
            font: '600 11px "IBM Plex Mono", monospace',
            fill: new Fill({ color: '#FFFFFF' }),
            textAlign: 'center',
            textBaseline: 'middle',
          }),
        })
      );

      if (roleCaption) {
        styles.push(
          new Style({
            text: new Text({
              text: roleCaption,
              offsetY: -19,
              font: '600 10px "IBM Plex Mono", monospace',
              fill: new Fill({ color: isStart ? '#6EE7B7' : '#F39C82' }),
              backgroundFill: new Fill({ color: 'rgba(9, 10, 13, 0.88)' }),
              padding: [1, 4, 1, 4],
            }),
          })
        );
      }

      const wpFeat = new Feature({
        geometry: new Point([normalizeLongitude(wp.lon), clampLatitude(wp.lat)]),
        waypointId: wp.id,
      });
      wpFeat.setStyle(styles);
      waypointSource.addFeature(wpFeat);
    });
  }, [plannerWaypoints, activeWaypointId]);

  // Handle external jump requests (quick jumps / shared coordinates)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !jumpRequest) return;
    const view = map.getView();
    view.animate({
      center: [normalizeLongitude(jumpRequest.lon), clampLatitude(jumpRequest.lat)],
      zoom: jumpRequest.zoom,
      duration: 450,
    });
  }, [jumpRequest]);

  const handleZoomIn = useCallback(() => {
    const view = mapRef.current?.getView();
    if (!view) return;
    const current = view.getZoom() ?? 9;
    view.animate({ zoom: Math.min(17, current + 1), duration: 180 });
  }, []);

  const handleZoomOut = useCallback(() => {
    const view = mapRef.current?.getView();
    if (!view) return;
    const current = view.getZoom() ?? 9;
    view.animate({ zoom: Math.max(1, current - 1), duration: 180 });
  }, []);

  const handleResetJezero = useCallback(() => {
    const view = mapRef.current?.getView();
    if (!view) return;
    view.animate({
      center: [JEZERO_MAP_CENTER.lon, JEZERO_MAP_CENTER.lat],
      zoom: 9.2,
      duration: 380,
    });
  }, []);

  const handleFocusHirise = useCallback(() => {
    const view = mapRef.current?.getView();
    if (!view) return;
    view.animate({
      center: [77.38, 18.49],
      zoom: 12.8,
      duration: 420,
    });
  }, []);

  const handleRetryTiles = useCallback(() => {
    const layers = layersRef.current;
    if (!layers) return;
    setTileErrors(0);
    [
      layers.ctxGlobal,
      layers.ctxJezero,
      layers.viking,
      layers.molaBase,
      layers.themisDayBase,
      layers.themisNightBase,
      layers.molaOverlay,
      layers.themisDayOverlay,
      layers.hiriseOverlay,
    ].forEach((l) => {
      if (l.getVisible()) {
        l.getSource()?.refresh();
      }
    });
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const el = wrapperRef.current;
    if (!el) return;

    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      setTimeout(() => mapRef.current?.updateSize(), 80);
      return;
    }

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setIsFullscreen(false);
      }
      return;
    }

    if (el.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        // Fallback when iframe restricts native Fullscreen API
      }
    }
    setIsPseudoFullscreen(true);
    setTimeout(() => mapRef.current?.updateSize(), 80);
  }, [isPseudoFullscreen]);

  // Coverage diagnostics for current viewport
  const coverageNotice = useMemo(() => {
    const ext = viewState.extent;
    if (
      (baseLayerId === 'themis-day-ir' || baseLayerId === 'themis-night-ir') &&
      !extentsIntersect(ext, THEMIS_CONTROLLED_EXTENT)
    ) {
      return {
        tone: 'warn' as const,
        message:
          'THEMIS Controlled IR Mosaics cover 65° S to 65° N only. Polar latitudes are outside dataset coverage.',
        actionLabel: 'Return to Jezero',
        onAction: handleResetJezero,
      };
    }

    if (
      baseLayerId === 'ctx-jezero' &&
      !extentsIntersect(ext, JEZERO_CTX_EXTENT) &&
      viewState.zoom >= 11.5
    ) {
      return {
        tone: 'info' as const,
        message:
          'Viewing Caltech Global CTX (~5 m/px). Controlled 6 m/px Jezero CTX applies inside 77.16°–77.70° E, 18.21°–18.72° N.',
        actionLabel: 'Center Jezero',
        onAction: handleResetJezero,
      };
    }

    if (overlays.hirise.enabled && !extentsIntersect(ext, JEZERO_HIRISE_EXTENT)) {
      return {
        tone: 'info' as const,
        message:
          'HiRISE 25 cm/px overlay is restricted to Jezero Crater (77.22°–77.58° E, 18.31°–18.67° N) and is not available across Mars.',
        actionLabel: 'Jump to HiRISE',
        onAction: handleFocusHirise,
      };
    }

    if (
      overlays.hirise.enabled &&
      extentsIntersect(ext, JEZERO_HIRISE_EXTENT) &&
      viewState.zoom < 10
    ) {
      return {
        tone: 'info' as const,
        message:
          'HiRISE 25 cm/px Jezero overlay active — zoom in (Z10–Z17) to resolve boulder and delta strata detail.',
        actionLabel: 'Zoom to Delta',
        onAction: handleFocusHirise,
      };
    }

    return null;
  }, [
    baseLayerId,
    overlays.hirise.enabled,
    viewState.extent,
    viewState.zoom,
    handleResetJezero,
    handleFocusHirise,
  ]);

  const activeBaseMeta = MARS_BASE_LAYERS[baseLayerId];
  const gsdMeters = approxMetersPerPixel(viewState.zoom, viewState.lat);
  const gsdLabel =
    gsdMeters >= 1000
      ? `${(gsdMeters / 1000).toFixed(2)} km/px`
      : gsdMeters >= 10
      ? `${gsdMeters.toFixed(0)} m/px`
      : `${gsdMeters.toFixed(2)} m/px`;

  const displayCoords = pointerCoords ?? {
    lat: viewState.lat,
    lon: viewState.lon,
  };

  const fullScreenActive = isFullscreen || isPseudoFullscreen;

  const isInsideHirise = isPointInExtent(
    viewState.lon,
    viewState.lat,
    JEZERO_HIRISE_EXTENT
  );

  return (
    <div
      ref={wrapperRef}
      className={
        fullScreenActive
          ? 'fixed inset-0 z-50 bg-[#07080B] flex flex-col'
          : `relative w-full ${
              heightClassName ??
              'h-[540px] sm:h-[640px] lg:h-[calc(100vh-12.5rem)] min-h-[540px]'
            } bg-[#07080B] border border-[#232732] rounded-lg overflow-hidden`
      }
    >
      {/* OpenLayers Canvas Target */}
      <div
        ref={mapTargetRef}
        className="ares-map-container w-full h-full bg-[#06070A]"
        aria-label="Interactive 2D Scientific Map of Mars"
      />

      {/* Top-left HUD: Active Layer + Streaming & Coverage Status */}
      <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2 max-w-[calc(100%-68px)] pointer-events-none">
        <div className="inline-flex max-w-full items-center gap-2 px-3 py-1.5 bg-[#0D0F14]/92 border border-[#232732] rounded text-xs text-[#E6E8EC] pointer-events-auto overflow-hidden">
          <Compass className="w-3.5 h-3.5 text-[#D9532F] shrink-0" />
          <span className="font-medium truncate min-w-0">
            {activeBaseMeta.label}
          </span>
          {overlays.hirise.enabled && isInsideHirise && (
            <>
              <span className="text-[#565E70] shrink-0" aria-hidden="true">
                ·
              </span>
              <span className="text-[#F39C82] font-mono text-[11px] whitespace-nowrap shrink-0">
                + HiRISE 25 cm
              </span>
            </>
          )}
          {pendingTiles > 0 && (
            <Loader2
              className="w-3.5 h-3.5 text-[#F39C82] animate-spin shrink-0"
              aria-label="Loading map tiles"
            />
          )}
        </div>

        {addWaypointMode && (
          <div className="flex flex-wrap items-center gap-2.5 px-3 py-1.5 bg-[#191210]/95 border border-[#D9532F] rounded text-xs text-white pointer-events-auto">
            <span className="font-medium text-[#F7B29B]">
              Add Waypoint Mode Active
            </span>
            <span className="text-[#C7CCD6]">
              Click Martian surface to place Waypoint #{(plannerWaypoints?.length ?? 0) + 1}
            </span>
            {onToggleAddWaypointMode && (
              <button
                type="button"
                onClick={onToggleAddWaypointMode}
                className="px-2 py-0.5 text-[11px] font-medium text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        )}

        {coverageNotice && (
          <div
            className={`flex flex-wrap items-center gap-2.5 px-3 py-1.5 rounded border text-xs pointer-events-auto ${
              coverageNotice.tone === 'warn'
                ? 'bg-[#191210]/95 border-[#D9532F]/60 text-[#F7B29B]'
                : 'bg-[#0D0F14]/92 border-[#232732] text-[#C7CCD6]'
            }`}
          >
            {coverageNotice.tone === 'warn' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-[#D9532F] shrink-0" />
            ) : (
              <Info className="w-3.5 h-3.5 text-[#E5A952] shrink-0" />
            )}
            <span>{coverageNotice.message}</span>
            <button
              type="button"
              onClick={coverageNotice.onAction}
              className="px-2 py-0.5 text-[11px] font-medium text-white bg-[#1E222D] hover:bg-[#2B3140] border border-[#353C4E] rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              {coverageNotice.actionLabel}
            </button>
          </div>
        )}

        {tileErrors > 2 && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#191210]/95 border border-[#D9532F]/60 rounded text-xs text-[#F7B29B] pointer-events-auto">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D9532F] shrink-0" />
            <span>
              Some NASA Mars Trek tiles failed to load ({tileErrors}). Check connection or retry.
            </span>
            <button
              type="button"
              onClick={handleRetryTiles}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-white bg-[#D9532F] hover:bg-[#B64223] rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Top-right Map Control Stack */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <div className="flex flex-col bg-[#0D0F14]/92 border border-[#232732] rounded overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
            className="w-10 h-10 flex items-center justify-center text-[#E6E8EC] hover:text-white hover:bg-[#1A1E27] border-b border-[#232732] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
            className="w-10 h-10 flex items-center justify-center text-[#E6E8EC] hover:text-white hover:bg-[#1A1E27] transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetJezero}
          title="Reset view to Jezero Crater"
          aria-label="Reset view to Jezero Crater"
          className="w-10 h-10 flex items-center justify-center bg-[#0D0F14]/92 hover:bg-[#1A1E27] text-[#E6E8EC] hover:text-white border border-[#232732] rounded transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowFootprints((prev) => !prev)}
          aria-pressed={showFootprints}
          title="Toggle dataset coverage footprints"
          aria-label="Toggle dataset coverage footprints"
          className={`w-10 h-10 flex items-center justify-center border rounded transition-colors cursor-pointer ${
            showFootprints
              ? 'bg-[#D9532F]/20 border-[#D9532F]/70 text-[#F39C82]'
              : 'bg-[#0D0F14]/92 hover:bg-[#1A1E27] border-[#232732] text-[#9CA3AF]'
          }`}
        >
          <Frame className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-pressed={fullScreenActive}
          title={fullScreenActive ? 'Exit full screen' : 'Full-screen map'}
          aria-label={fullScreenActive ? 'Exit full screen' : 'Full-screen map'}
          className="w-10 h-10 flex items-center justify-center bg-[#0D0F14]/92 hover:bg-[#1A1E27] text-[#E6E8EC] hover:text-white border border-[#232732] rounded transition-colors cursor-pointer"
        >
          {fullScreenActive ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Bottom-left Scale Bar (True Mars Radius R = 3,396.19 km) */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 px-3 py-2 bg-[#0D0F14]/92 border border-[#232732] rounded pointer-events-none">
        <div className="ares-ol-scale" ref={scaleTargetRef} />
        <span className="text-[11px] font-mono tabular-nums text-[#9CA3AF] whitespace-nowrap">
          Z{viewState.zoom.toFixed(1)} · ~{gsdLabel}
        </span>
      </div>

      {/* Bottom-right Live Coordinate Readout */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 px-3 py-2 bg-[#0D0F14]/92 border border-[#232732] rounded text-xs pointer-events-none">
        <Crosshair className="w-3.5 h-3.5 text-[#D9532F] shrink-0" />
        <span className="text-[#9CA3AF] hidden sm:inline">
          {pointerCoords ? 'Pointer:' : 'Center:'}
        </span>
        <span className="font-mono tabular-nums text-[#F3F4F6] whitespace-nowrap">
          {formatMarsLatLonDetailed(displayCoords.lat, displayCoords.lon)}
        </span>
        <span className="hidden md:inline text-[11px] font-mono text-[#7E8694] border-l border-[#232732] pl-2">
          EPSG:104905
        </span>
      </div>
    </div>
  );
}
