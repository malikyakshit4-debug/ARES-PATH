import { jsPDF } from 'jspdf';
import {
  ATMOSPHERIC_COMPOSITION_DATA,
  TEMPERATURE_BENCHMARKS,
} from '../data/survivalKnowledgeBase';
import {
  MissionReportDocument,
  ReportSection,
} from '../types/reports';
import { JEZERO_HIRISE_EXTENT } from './marsMapLayers';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 16;
const MARGIN_R = 16;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 18;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // 178 mm

const COLOR_INK = [17, 24, 39] as const;
const COLOR_MUTED = [71, 85, 105] as const;
const COLOR_SUBTLE = [100, 116, 139] as const;
const COLOR_BORDER = [203, 213, 225] as const;
const COLOR_BG_LIGHT = [248, 250, 252] as const;
const COLOR_HEADER_DARK = [15, 23, 42] as const;
const COLOR_MARS = [217, 83, 47] as const;
const COLOR_WARN_BG = [254, 242, 242] as const;
const COLOR_WARN_BORDER = [252, 165, 165] as const;
const COLOR_WARN_TEXT = [153, 27, 27] as const;
const COLOR_AMBER_BG = [255, 251, 235] as const;
const COLOR_AMBER_BORDER = [253, 230, 138] as const;
const COLOR_AMBER_TEXT = [146, 64, 14] as const;

export function sanitizePdfText(input: string): string {
  return input
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₀/g, '0')
    .replace(/¹/g, '1')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/—/g, ' - ')
    .replace(/–/g, '-')
    .replace(/→/g, '->')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≈/g, '~')
    .replace(/•/g, '*')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\xFF]/g, '');
}

function sanitizeFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'ares-path-mission-report';
}

function getColumnWidths(columns: string[]): number[] {
  const count = columns.length;
  if (count === 3) {
    return [44, 72, 62];
  }
  if (count === 4) {
    if (columns[0] === 'Consideration') {
      return [42, 20, 62, 54];
    }
    if (columns[0] === 'Class') {
      return [22, 42, 56, 58];
    }
    return [42, 34, 52, 50];
  }
  if (count === 5) {
    if (columns[0] === 'Order') {
      return [14, 24, 50, 56, 34];
    }
    if (columns[0] === 'Leg') {
      return [18, 46, 46, 34, 34];
    }
    if (columns[0] === 'Consideration') {
      return [34, 24, 16, 50, 54];
    }
    return [38, 30, 24, 36, 50];
  }
  if (count === 6) {
    if (columns[0] === 'Class') {
      // References table
      return [16, 36, 26, 26, 24, 50];
    }
    // Orbital datasets table
    return [34, 26, 22, 26, 22, 48];
  }
  if (count === 7) {
    if (columns[0] === 'Segment') {
      return [38, 20, 20, 22, 18, 24, 36];
    }
    // Scientific observation table
    return [22, 28, 22, 24, 20, 28, 34];
  }
  const equal = CONTENT_W / Math.max(count, 1);
  return columns.map(() => equal);
}

export function buildMissionReportPdf(docData: MissionReportDocument): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let y = MARGIN_TOP;

  const ensureSpace = (neededMm: number): boolean => {
    if (y + neededMm > PAGE_H - MARGIN_BOTTOM) {
      pdf.addPage();
      y = MARGIN_TOP;
      return true;
    }
    return false;
  };

  const writeWrappedParagraph = (
    text: string,
    x: number,
    maxW: number,
    fontSize: number,
    lineH: number,
    color: readonly [number, number, number] = COLOR_INK,
    fontStyle: 'normal' | 'bold' = 'normal'
  ) => {
    pdf.setFont('helvetica', fontStyle);
    pdf.setFontSize(fontSize);
    pdf.setTextColor(color[0], color[1], color[2]);
    const lines = pdf.splitTextToSize(sanitizePdfText(text), maxW) as string[];
    for (const line of lines) {
      ensureSpace(lineH + 1);
      pdf.text(line, x, y);
      y += lineH;
    }
  };

  // --- Cover / Masthead Block ---
  pdf.setFillColor(COLOR_HEADER_DARK[0], COLOR_HEADER_DARK[1], COLOR_HEADER_DARK[2]);
  pdf.rect(MARGIN_L, 14, CONTENT_W, 24, 'F');
  pdf.setFillColor(COLOR_MARS[0], COLOR_MARS[1], COLOR_MARS[2]);
  pdf.rect(MARGIN_L, 38, CONTENT_W, 1.4, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(243, 156, 130);
  pdf.text(
    sanitizePdfText(`ARES PATH · ${docData.reportTypeLabel.toUpperCase()}`),
    MARGIN_L + 5,
    21
  );

  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  const titleLines = pdf.splitTextToSize(
    sanitizePdfText(docData.title),
    CONTENT_W - 10
  ) as string[];
  pdf.text(titleLines[0] ?? 'ARES PATH Mission Report', MARGIN_L + 5, 28);
  if (titleLines.length > 1) {
    pdf.setFontSize(10.5);
    pdf.text(titleLines[1], MARGIN_L + 5, 34);
  } else {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(203, 213, 225);
    const subLines = pdf.splitTextToSize(
      sanitizePdfText(docData.subtitle),
      CONTENT_W - 10
    ) as string[];
    pdf.text(subLines[0] ?? '', MARGIN_L + 5, 34.2);
  }

  y = 43.5;

  // Metadata 2x2 grid
  const metaRows: Array<[string, string, string, string]> = [
    ['REPORT ID', docData.reportId, 'CREATED (UTC)', docData.createdAtDisplay],
    [
      'PLANET / CRS',
      `${docData.planet} · ${docData.coordinateReferenceSystem}`,
      'TARGET',
      docData.routeSnapshot
        ? `${docData.routeSnapshot.routeName} (${docData.routeSnapshot.waypointCount} wps)`
        : docData.selectedLocation
        ? `${docData.selectedLocation.label} (${docData.selectedLocation.lat.toFixed(2)}°, ${docData.selectedLocation.lon.toFixed(2)}°)`
        : docData.selectedRegionName ?? 'Mars Planetary Reference',
    ],
  ];

  const halfW = CONTENT_W / 2;
  for (const [k1, v1, k2, v2] of metaRows) {
    pdf.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
    pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    pdf.rect(MARGIN_L, y, halfW, 12, 'FD');
    pdf.rect(MARGIN_L + halfW, y, halfW, 12, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(COLOR_SUBTLE[0], COLOR_SUBTLE[1], COLOR_SUBTLE[2]);
    pdf.text(sanitizePdfText(k1), MARGIN_L + 2.5, y + 4);
    pdf.text(sanitizePdfText(k2), MARGIN_L + halfW + 2.5, y + 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.2);
    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    const v1Line = (pdf.splitTextToSize(sanitizePdfText(v1), halfW - 5) as string[])[0] ?? '';
    const v2Line = (pdf.splitTextToSize(sanitizePdfText(v2), halfW - 5) as string[])[0] ?? '';
    pdf.text(v1Line, MARGIN_L + 2.5, y + 9);
    pdf.text(v2Line, MARGIN_L + halfW + 2.5, y + 9);
    y += 12;
  }

  y += 3;

  // Non-certification Disclaimer Banner
  const discText =
    docData.reportType === 'route'
      ? 'SCIENTIFIC & SAFETY NOTICE: This is a conceptual surface traverse compiled from NASA orbital mosaics and published planetary archives. No route is certified safe, optimal, or astronaut-approved.'
      : 'SCIENTIFIC NOTICE: Compiled exclusively from NASA Mars Trek WMTS coverage and cited historical NASA/PDS archives. No live weather telemetry or human-landing safety certification is provided.';
  const discLines = pdf.splitTextToSize(sanitizePdfText(discText), CONTENT_W - 8) as string[];
  const discH = discLines.length * 4 + 5;
  pdf.setFillColor(COLOR_WARN_BG[0], COLOR_WARN_BG[1], COLOR_WARN_BG[2]);
  pdf.setDrawColor(COLOR_WARN_BORDER[0], COLOR_WARN_BORDER[1], COLOR_WARN_BORDER[2]);
  pdf.rect(MARGIN_L, y, CONTENT_W, discH, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.8);
  pdf.setTextColor(COLOR_WARN_TEXT[0], COLOR_WARN_TEXT[1], COLOR_WARN_TEXT[2]);
  let dy = y + 4.8;
  for (const line of discLines) {
    pdf.text(line, MARGIN_L + 4, dy);
    dy += 4;
  }
  y += discH + 5;

  // Helper to draw multi-page tables safely
  const renderTable = (columns: string[], rows: string[][], linkColIndex?: number) => {
    if (rows.length === 0) return;
    const colWidths = getColumnWidths(columns);
    const headerH = 7.5;

    const drawHeader = () => {
      pdf.setFillColor(226, 232, 240);
      pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      let cx = MARGIN_L;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
      for (let i = 0; i < columns.length; i++) {
        pdf.rect(cx, y, colWidths[i], headerH, 'FD');
        const hLine = (
          pdf.splitTextToSize(sanitizePdfText(columns[i]), colWidths[i] - 3) as string[]
        )[0] ?? '';
        pdf.text(hLine, cx + 1.5, y + 4.8);
        cx += colWidths[i];
      }
      y += headerH;
    };

    ensureSpace(headerH + 10);
    drawHeader();

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);

      const cellLines = row.map((cell, cIdx) =>
        pdf.splitTextToSize(sanitizePdfText(cell ?? ''), colWidths[cIdx] - 3) as string[]
      );
      const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
      const rowH = Math.max(6.5, maxLines * 3.4 + 3);

      if (y + rowH > PAGE_H - MARGIN_BOTTOM) {
        pdf.addPage();
        y = MARGIN_TOP;
        drawHeader();
      }

      const bg = rIdx % 2 === 1 ? COLOR_BG_LIGHT : ([255, 255, 255] as const);
      let cx = MARGIN_L;
      for (let cIdx = 0; cIdx < columns.length; cIdx++) {
        pdf.setFillColor(bg[0], bg[1], bg[2]);
        pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        pdf.rect(cx, y, colWidths[cIdx], rowH, 'FD');

        const lines = cellLines[cIdx] ?? [''];
        const rawCell = row[cIdx] ?? '';
        const isLink =
          linkColIndex === cIdx && rawCell.startsWith('https://');

        if (isLink) {
          pdf.setTextColor(29, 78, 216);
        } else {
          pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
        }

        let ty = y + 4.1;
        for (let lIdx = 0; lIdx < lines.length; lIdx++) {
          if (isLink && lIdx === 0) {
            pdf.textWithLink(lines[lIdx], cx + 1.5, ty, { url: rawCell });
          } else {
            pdf.text(lines[lIdx], cx + 1.5, ty);
          }
          ty += 3.4;
        }
        cx += colWidths[cIdx];
      }
      y += rowH;
    }
    y += 3.5;
  };

  // Vector Visual Renderers
  const renderAtmosphereVisual = () => {
    ensureSpace(34);
    pdf.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
    pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    pdf.rect(MARGIN_L, y, CONTENT_W, 28, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    pdf.text(
      'Cat C Planetary Reference: Atmospheric Bulk Composition (% by Volume)',
      MARGIN_L + 3,
      y + 5.2
    );

    // Stacked horizontal bar
    const barX = MARGIN_L + 3;
    const barY = y + 8;
    const barW = CONTENT_W - 6;
    const barH = 5;
    let curX = barX;
    const rgbMap: Record<string, [number, number, number]> = {
      '#D9532F': [217, 83, 47],
      '#E5A952': [229, 169, 82],
      '#60A5FA': [96, 165, 250],
      '#34D399': [52, 211, 153],
      '#A78BFA': [167, 139, 250],
      '#6B7280': [107, 114, 128],
    };
    for (const item of ATMOSPHERIC_COMPOSITION_DATA) {
      const segW = Math.max(0.8, (item.percent / 100) * barW);
      const rgb = rgbMap[item.color] ?? [107, 114, 128];
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      pdf.rect(curX, barY, Math.min(segW, barX + barW - curX), barH, 'F');
      curX += segW;
    }

    // Legend row
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.3);
    let lx = MARGIN_L + 3;
    let ly = y + 17.5;
    ATMOSPHERIC_COMPOSITION_DATA.forEach((item, idx) => {
      if (idx === 3) {
        lx = MARGIN_L + 3;
        ly = y + 23;
      }
      const rgb = rgbMap[item.color] ?? [107, 114, 128];
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      pdf.rect(lx, ly - 2.3, 2.4, 2.4, 'F');
      pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
      pdf.text(
        sanitizePdfText(`${item.gas}: ${item.percent.toFixed(2)}%`),
        lx + 3.6,
        ly
      );
      lx += 58;
    });

    y += 32;
  };

  const renderTemperatureVisual = () => {
    const boxH = 12 + TEMPERATURE_BENCHMARKS.length * 8.5 + 6;
    ensureSpace(boxH + 4);
    pdf.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
    pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    pdf.rect(MARGIN_L, y, CONTENT_W, boxH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    pdf.text(
      'Observed Martian Thermal Envelopes (Celsius, -150 C to +45 C Scale)',
      MARGIN_L + 3,
      y + 5.2
    );

    const chartX = MARGIN_L + 66;
    const chartW = CONTENT_W - 72;
    const minC = -150;
    const maxC = 45;
    const toX = (c: number) => chartX + ((c - minC) / (maxC - minC)) * chartW;

    // 0 C reference line
    const zeroX = toX(0);
    pdf.setDrawColor(59, 130, 246);
    pdf.line(zeroX, y + 8, zeroX, y + boxH - 6);

    let ry = y + 12;
    for (const row of TEMPERATURE_BENCHMARKS) {
      const isMatched =
        Boolean(docData.selectedLocation?.matchedSiteId) &&
        row.siteId === docData.selectedLocation?.matchedSiteId;

      pdf.setFont('helvetica', isMatched ? 'bold' : 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
      pdf.text(
        sanitizePdfText(`Cat ${row.classification} · ${row.label}`).slice(0, 38),
        MARGIN_L + 3,
        ry + 2.5
      );

      // Track
      pdf.setFillColor(226, 232, 240);
      pdf.rect(chartX, ry, chartW, 3.2, 'F');

      // Envelope bar
      const x1 = toX(row.minC);
      const x2 = toX(row.maxC);
      if (isMatched) {
        pdf.setFillColor(217, 83, 47);
      } else {
        pdf.setFillColor(100, 116, 139);
      }
      pdf.rect(x1, ry, Math.max(1.5, x2 - x1), 3.2, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.6);
      pdf.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
      pdf.text(`${row.minC}..${row.maxC} C`, chartX + chartW - 18, ry - 0.8);

      ry += 8.5;
    }

    // Scale footer
    pdf.setFontSize(6.6);
    pdf.setTextColor(COLOR_SUBTLE[0], COLOR_SUBTLE[1], COLOR_SUBTLE[2]);
    for (const t of [-140, -100, -60, -20, 0, 20, 40]) {
      pdf.text(`${t}C`, toX(t) - 2, y + boxH - 2);
    }

    y += boxH + 4;
  };

  const renderRouteSchematic = () => {
    const snap = docData.routeSnapshot;
    if (!snap || snap.waypoints.length === 0) return;

    const boxH = 62;
    ensureSpace(boxH + 4);
    pdf.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
    pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    pdf.rect(MARGIN_L, y, CONTENT_W, boxH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    pdf.text(
      sanitizePdfText(
        `Conceptual Traverse Schematic (EPSG:104905) · ${snap.waypointCount} Waypoints · ${snap.totalDistanceFormatted}`
      ),
      MARGIN_L + 3,
      y + 5.2
    );

    const plotX = MARGIN_L + 8;
    const plotY = y + 9;
    const plotW = CONTENT_W - 16;
    const plotH = 44;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(plotX, plotY, plotW, plotH, 'FD');

    const lons = snap.waypoints.map((w) => w.lon);
    const lats = snap.waypoints.map((w) => w.lat);
    let minLon = Math.min(...lons);
    let maxLon = Math.max(...lons);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);

    const lonSpan = Math.max(0.05, maxLon - minLon);
    const latSpan = Math.max(0.05, maxLat - minLat);
    minLon -= lonSpan * 0.22;
    maxLon += lonSpan * 0.22;
    minLat -= latSpan * 0.22;
    maxLat += latSpan * 0.22;

    const toPx = (lon: number) =>
      plotX + 6 + ((lon - minLon) / (maxLon - minLon)) * (plotW - 12);
    const toPy = (lat: number) =>
      plotY + plotH - 6 - ((lat - minLat) / (maxLat - minLat)) * (plotH - 12);

    // Optional Jezero HiRISE bounding box if viewport overlaps
    const [hMinLon, hMinLat, hMaxLon, hMaxLat] = JEZERO_HIRISE_EXTENT;
    if (
      hMaxLon >= minLon &&
      hMinLon <= maxLon &&
      hMaxLat >= minLat &&
      hMinLat <= maxLat
    ) {
      const bx1 = Math.max(plotX + 1, toPx(hMinLon));
      const bx2 = Math.min(plotX + plotW - 1, toPx(hMaxLon));
      const by1 = Math.max(plotY + 1, toPy(hMaxLat));
      const by2 = Math.min(plotY + plotH - 1, toPy(hMinLat));
      if (bx2 > bx1 && by2 > by1) {
        pdf.setDrawColor(148, 163, 184);
        pdf.rect(bx1, by1, bx2 - bx1, by2 - by1, 'D');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.2);
        pdf.setTextColor(100, 116, 139);
        pdf.text('Jezero HiRISE 25cm', bx1 + 1, by1 + 3);
      }
    }

    // Draw legs
    pdf.setDrawColor(217, 83, 47);
    pdf.setLineWidth(0.7);
    for (let i = 0; i < snap.waypoints.length - 1; i++) {
      const a = snap.waypoints[i];
      const b = snap.waypoints[i + 1];
      const ax = toPx(a.lon);
      const ay = toPy(a.lat);
      const bx = toPx(b.lon);
      const by = toPy(b.lat);
      pdf.line(ax, ay, bx, by);

      const leg = snap.legs[i];
      if (leg) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        pdf.text(
          sanitizePdfText(leg.formattedDistance),
          (ax + bx) / 2 + 1.5,
          (ay + by) / 2 - 1
        );
      }
    }
    pdf.setLineWidth(0.2);

    // Draw numbered waypoints
    snap.waypoints.forEach((wp, idx) => {
      const px = toPx(wp.lon);
      const py = toPy(wp.lat);
      if (idx === 0) {
        pdf.setFillColor(16, 185, 129);
      } else if (idx === snap.waypoints.length - 1) {
        pdf.setFillColor(217, 83, 47);
      } else {
        pdf.setFillColor(59, 130, 246);
      }
      pdf.circle(px, py, 2.3, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(idx + 1), px - 0.8, py + 0.8);

      pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.text(sanitizePdfText(wp.label || `Waypoint ${idx + 1}`).slice(0, 20), px + 3, py + 1);
    });

    // North indicator & coordinates span
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    pdf.text('N ^', plotX + plotW - 8, plotY + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.6);
    pdf.setTextColor(COLOR_SUBTLE[0], COLOR_SUBTLE[1], COLOR_SUBTLE[2]);
    pdf.text(
      `Frame: ${minLat.toFixed(2)}..${maxLat.toFixed(2)} deg lat, ${minLon.toFixed(2)}..${maxLon.toFixed(2)} deg lon (Green=Start, Blue=Intermediate, Terracotta=Destination)`,
      plotX,
      y + boxH - 2.5
    );

    y += boxH + 4;
  };

  // Classification Legend Compact Box
  ensureSpace(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
  pdf.text('EVIDENCE CLASSIFICATION FRAMEWORK (A-E)', MARGIN_L, y);
  y += 3;
  renderTable(
    ['Code', 'Classification', 'Scientific Meaning'],
    docData.classificationLegend.map((c) => [
      `Cat ${c.code}`,
      c.label.replace(/^Category [A-E] — /, ''),
      c.description,
    ])
  );

  // Render All Report Sections
  const renderSection = (section: ReportSection) => {
    ensureSpace(22);

    // Section Title Bar
    pdf.setDrawColor(COLOR_MARS[0], COLOR_MARS[1], COLOR_MARS[2]);
    pdf.setLineWidth(0.45);
    pdf.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
    pdf.setLineWidth(0.2);
    y += 5;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
    pdf.text(
      sanitizePdfText(`${section.number}. ${section.title}`),
      MARGIN_L,
      y
    );
    y += 5;

    if (section.summaryText) {
      writeWrappedParagraph(section.summaryText, MARGIN_L, CONTENT_W, 8.6, 4.1, COLOR_MUTED);
      y += 1.5;
    }

    if (section.unavailableReason) {
      const uLines = pdf.splitTextToSize(
        sanitizePdfText(`DATA UNAVAILABLE: ${section.unavailableReason}`),
        CONTENT_W - 6
      ) as string[];
      const uH = uLines.length * 4 + 4;
      ensureSpace(uH + 2);
      pdf.setFillColor(COLOR_AMBER_BG[0], COLOR_AMBER_BG[1], COLOR_AMBER_BG[2]);
      pdf.setDrawColor(COLOR_AMBER_BORDER[0], COLOR_AMBER_BORDER[1], COLOR_AMBER_BORDER[2]);
      pdf.rect(MARGIN_L, y, CONTENT_W, uH, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.8);
      pdf.setTextColor(COLOR_AMBER_TEXT[0], COLOR_AMBER_TEXT[1], COLOR_AMBER_TEXT[2]);
      let uy = y + 4.4;
      for (const line of uLines) {
        pdf.text(line, MARGIN_L + 3, uy);
        uy += 4;
      }
      y += uH + 3;
    }

    if (section.keyValues && section.keyValues.length > 0) {
      for (const kv of section.keyValues) {
        const valLines = pdf.splitTextToSize(
          sanitizePdfText(kv.value),
          CONTENT_W - 58
        ) as string[];
        const noteLines = kv.note
          ? (pdf.splitTextToSize(sanitizePdfText(kv.note), CONTENT_W - 58) as string[])
          : [];
        const rowH = Math.max(7, (valLines.length + noteLines.length) * 3.8 + 3);
        ensureSpace(rowH + 1);
        pdf.setFillColor(COLOR_BG_LIGHT[0], COLOR_BG_LIGHT[1], COLOR_BG_LIGHT[2]);
        pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
        pdf.rect(MARGIN_L, y, 54, rowH, 'FD');
        pdf.setFillColor(255, 255, 255);
        pdf.rect(MARGIN_L + 54, y, CONTENT_W - 54, rowH, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.6);
        pdf.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
        const keyLine = (pdf.splitTextToSize(sanitizePdfText(kv.label), 50) as string[])[0] ?? '';
        pdf.text(keyLine, MARGIN_L + 2, y + 4.6);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.1);
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
        let vy = y + 4.6;
        for (const vl of valLines) {
          pdf.text(vl, MARGIN_L + 56, vy);
          vy += 3.8;
        }
        if (noteLines.length > 0) {
          pdf.setFontSize(7.1);
          pdf.setTextColor(COLOR_SUBTLE[0], COLOR_SUBTLE[1], COLOR_SUBTLE[2]);
          for (const nl of noteLines) {
            pdf.text(nl, MARGIN_L + 56, vy);
            vy += 3.5;
          }
        }
        y += rowH;
      }
      y += 3;
    }

    if (section.visualKind === 'atmosphere-chart') {
      renderAtmosphereVisual();
    } else if (section.visualKind === 'temperature-chart') {
      renderTemperatureVisual();
    } else if (section.visualKind === 'route-schematic') {
      renderRouteSchematic();
    }

    if (section.bulletItems && section.bulletItems.length > 0) {
      for (const item of section.bulletItems) {
        const bLines = pdf.splitTextToSize(
          sanitizePdfText(`- ${item}`),
          CONTENT_W - 4
        ) as string[];
        ensureSpace(bLines.length * 4 + 1);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.2);
        pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
        for (const bl of bLines) {
          pdf.text(bl, MARGIN_L + 2, y);
          y += 3.9;
        }
        y += 0.8;
      }
      y += 2;
    }

    if (section.table && section.table.rows.length > 0) {
      const linkColIdx = section.table.columns.indexOf('Source URL');
      renderTable(
        section.table.columns,
        section.table.rows,
        linkColIdx >= 0 ? linkColIdx : undefined
      );
    }

    y += 2;
  };

  for (const section of docData.sections) {
    renderSection(section);
  }

  // Stamp running headers (p.2+) and footers (all pages)
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    if (i > 1) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(COLOR_SUBTLE[0], COLOR_SUBTLE[1], COLOR_SUBTLE[2]);
      pdf.text(
        sanitizePdfText(`ARES PATH · ${docData.reportTypeLabel} · ${docData.reportId}`),
        MARGIN_L,
        11.5
      );
      pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
      pdf.line(MARGIN_L, 13.5, PAGE_W - MARGIN_R, 13.5);
    }

    pdf.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    pdf.line(MARGIN_L, PAGE_H - 13, PAGE_W - MARGIN_R, PAGE_H - 13);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(COLOR_SUBTLE[0], COLOR_SUBTLE[1], COLOR_SUBTLE[2]);
    pdf.text(
      'NASA Space Apps Challenge 2026 · Conceptual Mission Intelligence - Not Safety Certified',
      MARGIN_L,
      PAGE_H - 8.5
    );
    pdf.text(
      `Page ${i} of ${totalPages}`,
      PAGE_W - MARGIN_R - 18,
      PAGE_H - 8.5
    );
  }

  return pdf;
}

export function exportMissionReportToPdf(docData: MissionReportDocument): void {
  const pdf = buildMissionReportPdf(docData);
  const filename = `${sanitizeFilename(docData.title)}-${docData.reportId.toLowerCase()}.pdf`;
  pdf.save(filename);
}
