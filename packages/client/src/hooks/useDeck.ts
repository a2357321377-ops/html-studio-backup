import { create } from 'zustand';
import type { Deck, Slide, LayoutType } from '@html-studio/shared';
import { getLayoutMeta } from '@html-studio/shared';

let nextId = 0;
function nanoid() {
  return `s${Date.now().toString(36)}${(nextId++).toString(36)}`;
}

interface DeckState {
  deck: Deck | null;
  currentSlideIndex: number;

  initDeck: (title: string, slides: Slide[], theme: string) => void;
  setGlobalTheme: (theme: string) => void;
  setCurrentSlideIndex: (index: number) => void;
  addSlide: (layout: LayoutType, theme: string) => void;
  removeSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  updateSlideLayout: (slideId: string, layout: LayoutType) => void;
  updateSlideTheme: (slideId: string, theme: string) => void;
  updateSlideAnimation: (slideId: string, animation: string) => void;
  updateSlideFx: (slideId: string, fx: string | null) => void;
  updateSlotValue: (slideId: string, slotId: string, value: string) => void;
  updateSlideNotes: (slideId: string, notes: string) => void;
}

function createSlide(layout: LayoutType, theme: string, order: number): Slide {
  const meta = getLayoutMeta(layout);
  return {
    id: nanoid(),
    layout,
    theme,
    animation: 'fade-up',
    fx: null,
    slots: meta.slotDefs.map(def => ({
      id: def.id,
      type: def.type,
      value: def.default,
      label: def.label,
    })),
    notes: '',
    order,
  };
}

export const useDeck = create<DeckState>((set, get) => ({
  deck: null,
  currentSlideIndex: 0,

  initDeck: (title, slides, theme) => set({
    deck: {
      id: nanoid(),
      title,
      slides,
      globalTheme: theme,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    currentSlideIndex: 0,
  }),

  setGlobalTheme: (theme) => set(state => {
    if (!state.deck) return state;
    return { deck: { ...state.deck, globalTheme: theme, updatedAt: Date.now() } };
  }),

  setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),

  addSlide: (layout, theme) => set(state => {
    if (!state.deck) return state;
    const newSlide = createSlide(layout, theme, state.deck.slides.length);
    return {
      deck: { ...state.deck, slides: [...state.deck.slides, newSlide], updatedAt: Date.now() },
    };
  }),

  removeSlide: (slideId) => set(state => {
    if (!state.deck) return state;
    const slides = state.deck.slides.filter(s => s.id !== slideId).map((s, i) => ({ ...s, order: i }));
    return {
      deck: { ...state.deck, slides, updatedAt: Date.now() },
      currentSlideIndex: Math.min(state.currentSlideIndex, Math.max(0, slides.length - 1)),
    };
  }),

  duplicateSlide: (slideId) => set(state => {
    if (!state.deck) return state;
    const idx = state.deck.slides.findIndex(s => s.id === slideId);
    if (idx === -1) return state;
    const original = state.deck.slides[idx];
    const clone: Slide = { ...original, id: nanoid(), order: idx + 1 };
    const slides = [...state.deck.slides];
    slides.splice(idx + 1, 0, clone);
    return {
      deck: { ...state.deck, slides: slides.map((s, i) => ({ ...s, order: i })), updatedAt: Date.now() },
    };
  }),

  reorderSlides: (fromIndex, toIndex) => set(state => {
    if (!state.deck) return state;
    const slides = [...state.deck.slides];
    const [moved] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, moved);
    return {
      deck: { ...state.deck, slides: slides.map((s, i) => ({ ...s, order: i })), updatedAt: Date.now() },
    };
  }),

  updateSlideLayout: (slideId, layout) => set(state => {
    if (!state.deck) return state;
    const meta = getLayoutMeta(layout);
    const slides = state.deck.slides.map(s => {
      if (s.id !== slideId) return s;
      const existingValues = new Map(s.slots.map(slot => [slot.id, slot.value]));
      return {
        ...s,
        layout,
        slots: meta.slotDefs.map(def => ({
          id: def.id,
          type: def.type,
          value: existingValues.get(def.id) ?? def.default,
          label: def.label,
        })),
      };
    });
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } };
  }),

  updateSlideTheme: (slideId, theme) => set(state => {
    if (!state.deck) return state;
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, theme } : s);
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } };
  }),

  updateSlideAnimation: (slideId, animation) => set(state => {
    if (!state.deck) return state;
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, animation } : s);
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } };
  }),

  updateSlideFx: (slideId, fx) => set(state => {
    if (!state.deck) return state;
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, fx } : s);
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } };
  }),

  updateSlotValue: (slideId, slotId, value) => set(state => {
    if (!state.deck) return state;
    const slides = state.deck.slides.map(s => {
      if (s.id !== slideId) return s;
      return { ...s, slots: s.slots.map(slot => slot.id === slotId ? { ...slot, value } : slot) };
    });
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } };
  }),

  updateSlideNotes: (slideId, notes) => set(state => {
    if (!state.deck) return state;
    const slides = state.deck.slides.map(s => s.id === slideId ? { ...s, notes } : s);
    return { deck: { ...state.deck, slides, updatedAt: Date.now() } };
  }),
}));