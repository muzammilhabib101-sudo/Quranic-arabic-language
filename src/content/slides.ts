import manifest from "@content/slides.json";
import { asset } from "@/lib/base-path";

export type SlideInfo = { n: number; w: number; h: number };

export const slideCount: number = manifest.count;
export const slides: SlideInfo[] = manifest.slides;

export const THUMB_WIDTH = 320;

const file = (n: number) => `${String(n).padStart(3, "0")}.webp`;
export const slideSrc = (n: number) => asset(`/slides/${file(n)}`);
export const thumbSrc = (n: number) => asset(`/slides/thumbs/${file(n)}`);

export const getSlide = (n: number): SlideInfo | undefined => slides[n - 1];
