export interface WaterfallStageDef {
  id: string;
  label: string;
  accent: string;
  scoreDelta?: number;
  scoreUnit?: string;
  rowDelta?: number;
  colDelta?: number;
}