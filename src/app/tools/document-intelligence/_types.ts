export interface ExtractedField {
  name: string;
  label: string;
  value: string;
  confidence: number;
  field_type: "text" | "date" | "currency";
  bbox: [number, number, number, number] | null; // [left, top, width, height] normalized 0-1
  page: number;
}

export interface StepEvent {
  step: "extract" | "classify" | "analyze" | "validate";
  label?: string;
  status: "running" | "done";
  doc_type?: string;
  doc_type_label?: string;
  classification_confidence?: number;
}

export interface DoneEvent {
  done: true;
  doc_type: string;
  doc_type_label: string;
  processing_mode: "digital" | "scanned" | "image";
  pages: number;
  page_image: string | null;
  field_count: number;
  classification_confidence: number;
}

export interface DocTypeInfo {
  id: string;
  label: string;
  description: string;
  fields: { name: string; label: string; field_type: string }[];
}

export type ProcessingStep = "idle" | "extract" | "classify" | "analyze" | "validate" | "done" | "error";

export interface StepState {
  status: "pending" | "running" | "done";
  label: string;
}