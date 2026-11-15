import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { CLASSIFICATION_SYSTEM } from '../../data/survivalKnowledgeBase';
import { ClassificationCode, ScientificObservation } from '../../types/survival';

const CLASSIFICATION_TEXT_COLOR: Record<ClassificationCode, string> = {
  A: 'text-[#6EE7B7]',
  B: 'text-[#60A5FA]',
  C: 'text-[#E5A952]',
  D: 'text-[#C4B5FD]',
  E: 'text-[#F39C82]',
};

interface ObservationCardProps {
  observation: ScientificObservation;
  contextBadge?: string;
}

export function ObservationCard({
  observation,
  contextBadge,
}: ObservationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const classMeta = CLASSIFICATION_SYSTEM[observation.classification];

  return (
    <article className="p-5 bg-[#111318] border border-[#232732] rounded-lg space-y-3.5">
      {/* Quiet unboxed metadata header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`font-mono font-medium ${CLASSIFICATION_TEXT_COLOR[observation.classification]}`}
          >
            {classMeta.shortLabel}
          </span>
          <span className="text-[#4B5263]" aria-hidden="true">
            ·
          </span>
          <span className="text-[#9CA3AF]">{observation.observationLocation}</span>
          {contextBadge && (
            <>
              <span className="text-[#4B5263]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#E5A952] font-medium">{contextBadge}</span>
            </>
          )}
        </div>
        <span className="text-[11px] font-mono text-[#8D95A5]">
          {observation.observationPeriod}
        </span>
      </div>

      {/* Title & Primary Metric */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-[#232732] pb-3">
        <h3 className="text-base font-semibold text-white">{observation.title}</h3>
        <div className="shrink-0 sm:text-right">
          <span className="text-lg font-mono font-semibold tabular-nums text-white">
            {observation.primaryValue}
          </span>
          {observation.unit && (
            <span className="text-xs font-mono text-[#9CA3AF] ml-1.5">
              {observation.unit}
            </span>
          )}
        </div>
      </div>

      {/* Concise scientific summary */}
      <p className="text-sm text-[#C7CCD6] leading-relaxed">{observation.summary}</p>

      {/* Key points */}
      {observation.details.length > 0 && (
        <ul className="space-y-1.5 text-xs text-[#9CA3AF]">
          {observation.details.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="text-[#D9532F] font-mono mt-0.5 shrink-0">—</span>
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Expandable Provenance & Limitations */}
      <div className="pt-2 border-t border-[#232732]/70">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E5A952] hover:text-white transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Scientific Provenance &amp; Limitations</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Inspect Scientific Provenance &amp; Limitations</span>
            </>
          )}
        </button>

        {expanded && (
          <dl className="mt-3 p-3.5 bg-[#0B0D12] border border-[#232732] rounded grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
            <div>
              <dt className="text-[#8D95A5]">Dataset / Mission</dt>
              <dd className="text-[#E6E8EC] mt-0.5">{observation.datasetOrMission}</dd>
            </div>
            <div>
              <dt className="text-[#8D95A5]">Instrument</dt>
              <dd className="text-[#E6E8EC] mt-0.5">{observation.instrument}</dd>
            </div>
            <div>
              <dt className="text-[#8D95A5]">Observation Location</dt>
              <dd className="text-[#E6E8EC] mt-0.5">{observation.observationLocation}</dd>
            </div>
            <div>
              <dt className="text-[#8D95A5]">Observation Date / Period</dt>
              <dd className="text-[#E6E8EC] font-mono mt-0.5">
                {observation.observationPeriod}
              </dd>
            </div>
            <div>
              <dt className="text-[#8D95A5]">Measurement Units</dt>
              <dd className="text-[#E6E8EC] font-mono mt-0.5">
                {observation.measurementUnits}
              </dd>
            </div>
            <div>
              <dt className="text-[#8D95A5]">Spatial Resolution</dt>
              <dd className="text-[#E6E8EC] mt-0.5">{observation.spatialResolution}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[#8D95A5]">Data Limitations</dt>
              <dd className="text-[#F7B29B] mt-0.5 leading-relaxed">
                {observation.limitations}
              </dd>
            </div>
            <div className="sm:col-span-2 pt-1">
              <a
                href={observation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#60A5FA] hover:text-white transition-colors"
              >
                <span>Source: {observation.sourceLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </dl>
        )}
      </div>
    </article>
  );
}
