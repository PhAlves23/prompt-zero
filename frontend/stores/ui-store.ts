"use client"

import { create } from "zustand"

type UiState = {
  selectedPeriod: "7d" | "30d" | "90d"
  setSelectedPeriod: (period: "7d" | "30d" | "90d") => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedPeriod: "30d",
  setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
}))
