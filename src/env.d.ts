/// <reference types="vite/client" />

declare const __VERSION__: string;

interface CustomCardEntry {
  type: string;
  name: string;
  description?: string;
  preview?: boolean;
}

interface Window {
  customCards?: CustomCardEntry[];
}
