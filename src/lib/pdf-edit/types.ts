export type EngineTextRun = {
  id: string;
  pageIndex: number;
  text: string;
  bounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  fontName?: string;
  fontSize?: number;
  rotation: number;
  objectId?: string;
  charRange?: {
    start: number;
    end: number;
  };
  lineCount?: number;
  canEdit: boolean;
  supportReason?: string;
};

export type EngineEditRequest = {
  runId: string;
  text: string;
};

export type EngineLoadResult = {
  docId: string;
  pageCount: number;
};

export type EnginePageTextResult = {
  runs: EngineTextRun[];
};

export type EngineApplyEditsResult = {
  bytes: ArrayBuffer;
};
