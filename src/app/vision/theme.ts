/** ML Vision world — signature colours, the app launch target, and the three
 *  vision-task definitions. Mirrors the ML Unified / EDA world themes.
 *  Every task here is live today, running ONNX models on the FastAPI backend. */

import { ML_UNIFIED_API } from "@/config/urls";

export const VISION_ACCENT = "#a78bfa";   // violet — matches the ML Vision card
export const VISION_ACCENT2 = "#38bdf8";  // sky — gradient partner

/** The live app is the Vision mode of the shared ML-Unified HF Space. */
export const APP_HREF = `${ML_UNIFIED_API}/?mode=vision`;

export type VisionTask = {
  key: string;
  label: string;
  models: string;
  classes: string;
  blurb: string;
};

export const TASKS: VisionTask[] = [
  {
    key: "classify",
    label: "Classification",
    models: "MobileNetV2 · ResNet50 · SqueezeNet · GoogLeNet",
    classes: "1000 ImageNet classes",
    blurb: "Upload an image and get the top predicted labels with confidence, from any of four ImageNet-trained backbones you can compare side by side.",
  },
  {
    key: "detect",
    label: "Detection",
    models: "TinyYOLOv3",
    classes: "80 COCO classes",
    blurb: "Find and box every object in the image, each with its label and confidence — people, vehicles, animals, everyday objects.",
  },
  {
    key: "segment",
    label: "Segmentation",
    models: "SegFormer-B0",
    classes: "150 ADE20K classes",
    blurb: "Label the scene pixel by pixel — sky, road, building, person, furniture — as a coloured overlay on your image.",
  },
];
