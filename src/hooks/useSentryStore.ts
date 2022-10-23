import create from "zustand";
import { SentryData } from "../typings/tokenMetadata";

type SentryStoreState = {
  sentries: SentryData[];
  setSentries: (payload: SentryData[]) => void;
};

export const useSentryStore = create<SentryStoreState>((set) => ({
  sentries: [],
  setSentries: () => set((state) => ({ ...state })),
}));
