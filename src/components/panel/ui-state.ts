"use client";

import { create } from "zustand";

export interface NewBookingPrefill {
  staffId?: string;
  date?: string;
  start?: number;
}

interface PanelUI {
  bookingId: string | null;
  newBooking: NewBookingPrefill | null;
  navOpen: boolean;
  openBooking: (id: string | null) => void;
  openNewBooking: (prefill?: NewBookingPrefill) => void;
  closeNewBooking: () => void;
  setNav: (open: boolean) => void;
}

export const usePanelUI = create<PanelUI>((set) => ({
  bookingId: null,
  newBooking: null,
  navOpen: false,
  openBooking: (bookingId) => set({ bookingId }),
  openNewBooking: (prefill = {}) => set({ newBooking: prefill }),
  closeNewBooking: () => set({ newBooking: null }),
  setNav: (navOpen) => set({ navOpen }),
}));
