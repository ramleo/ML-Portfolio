export interface WaterfallStage {
  id: string;
  label: string;
  accent: string;
  scoreDelta?: number;
  scoreUnit?: string;
  rowDelta?: number;
  colDelta?: number;
}