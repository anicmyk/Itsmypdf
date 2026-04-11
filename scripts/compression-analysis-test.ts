import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCompressionSummary,
  estimateCompressionOutcome,
  type PdfCompressionAnalysis
} from '../src/utils/pdfCompressionAnalysis.ts';

function makeAnalysis(overrides: Partial<PdfCompressionAnalysis> = {}): PdfCompressionAnalysis {
  return {
    fileName: 'sample.pdf',
    fileSizeBytes: 5 * 1024 * 1024,
    pageCount: 12,
    status: 'ready',
    contentType: 'mixed',
    textPages: 8,
    imagePages: 4,
    imageCount: 10,
    imageBytes: 1_500_000,
    maxImageWidth: 2400,
    maxImageHeight: 1800,
    embeddedFontCount: 2,
    embeddedFontSubsetCount: 1,
    metadataFieldCount: 2,
    metadataStreamBytes: 4096,
    hasMetadataStream: true,
    notes: [],
    warnings: [],
    canCompressMeaningfully: true,
    recommendedMode: 'smart',
    recommendedLevel: 'balanced',
    riskLevel: 'medium',
    estimateByMode: {
      smart: {
        minBytes: 0,
        maxBytes: 0,
        minReductionPercent: 0,
        maxReductionPercent: 0,
        confidence: 'medium',
        summary: '',
        bestEffort: true
      },
      aggressive: {
        minBytes: 0,
        maxBytes: 0,
        minReductionPercent: 0,
        maxReductionPercent: 0,
        confidence: 'medium',
        summary: '',
        bestEffort: true
      },
      lossless: {
        minBytes: 0,
        maxBytes: 0,
        minReductionPercent: 0,
        maxReductionPercent: 0,
        confidence: 'medium',
        summary: '',
        bestEffort: true
      }
    },
    ...overrides
  };
}

test('text-heavy PDFs get conservative estimates and never pretend 1KB is realistic', () => {
  const analysis = makeAnalysis({
    fileSizeBytes: 8 * 1024 * 1024,
    pageCount: 20,
    contentType: 'text-heavy',
    textPages: 20,
    imagePages: 0,
    imageCount: 0,
    embeddedFontCount: 3,
    metadataFieldCount: 1
  });

  const estimate = estimateCompressionOutcome(analysis, 'smart', 'balanced');
  assert.ok(estimate.minBytes > 1024, 'text-heavy estimate should not collapse to 1KB');
  assert.ok(estimate.maxBytes <= analysis.fileSizeBytes, 'estimate should not exceed original size');
  assert.ok(estimate.minReductionPercent <= 10, 'text-heavy smart compression should stay conservative');
});

test('scanned PDFs show a much wider and lower estimated output range', () => {
  const analysis = makeAnalysis({
    fileSizeBytes: 32 * 1024 * 1024,
    pageCount: 60,
    contentType: 'scanned',
    textPages: 1,
    imagePages: 60,
    imageCount: 120,
    embeddedFontCount: 0,
    metadataFieldCount: 0
  });

  const smartEstimate = estimateCompressionOutcome(analysis, 'smart', 'balanced');
  const aggressiveEstimate = estimateCompressionOutcome(analysis, 'aggressive', 'maximum');
  assert.ok(aggressiveEstimate.minBytes <= smartEstimate.minBytes, 'aggressive mode should allow smaller output than smart mode');
  assert.ok(aggressiveEstimate.maxReductionPercent >= smartEstimate.maxReductionPercent, 'aggressive mode should promise a stronger best-effort reduction');
});

test('very small PDFs are treated as near-minimum already', () => {
  const analysis = makeAnalysis({
    fileSizeBytes: 120 * 1024,
    pageCount: 2,
    contentType: 'small',
    textPages: 2,
    imagePages: 0,
    imageCount: 0,
    metadataFieldCount: 0,
    notes: ['Tiny file'],
    warnings: []
  });

  const estimate = estimateCompressionOutcome(analysis, 'smart', 'low');
  assert.ok(estimate.maxBytes <= analysis.fileSizeBytes, 'small file estimate should not exceed original size');
  assert.ok(estimate.minBytes >= 1024, 'estimate should stay above a floor');
  assert.ok(estimate.maxReductionPercent <= 5, 'small files should only allow minor reductions');
});

test('buildCompressionSummary exposes honest output labels', () => {
  const analysis = makeAnalysis();
  const summary = buildCompressionSummary(analysis, 'smart', 'balanced');

  assert.match(summary.summary, /best effort/i);
  assert.match(summary.outputRangeLabel, /MB|KB/);
  assert.ok(summary.minBytes <= summary.maxBytes);
});
