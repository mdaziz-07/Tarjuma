import type { GoldieConfig } from "goldie";

const config: GoldieConfig = {
  appRoot: "e:/Tarjuma React",
  android: {
    appPath: "../android/app/release/app-release.apk",
    applicationId: "com.tarjuma.app",
  },
  devices: ["pixel-10-pro"],
  locales: ["en-US"],
  appearance: "dark",
  frame: { variant: "17-pro-blue" },

  theme: {
    background: "linear-gradient(165deg, #020617 0%, #061e1a 50%, #020617 100%)",
    headlineColor: "#FFFFFF",
    subheadColor: "#94A3B8",
    fontFamily: 'system-ui, -apple-system, sans-serif',
    copyHeightRatio: 0.22,
    deviceWidthRatio: 0.85,
    template: "uniform",
    layout: "classic",
  },

  store: {
    name: "Tarjuma",
    subtitle: { "en-US": "Quran with Hindi Audio" },
    developer: "Tarjuma Team",
    category: "Books & Reference",
    rating: 4.9,
    ratingCount: "2.5K Reviews",
    ageRating: "3+",
    price: "Free",
    description: {
      "en-US": "Tarjuma brings the Holy Quran to Hindi-speaking Muslims with crystal-clear Arabic recitations, synchronized Hindi audio translations, ambient soundscapes, and renowned reciters.",
    },
  },

  scenes: [
    {
      kind: "screenshot",
      id: "home",
      flow: "store-01-home",
      headline: { "en-US": "Understand Every Ayah" },
      subhead: { "en-US": "Holy Quran recitation with synchronized Hindi audio translation." },
    },
    {
      kind: "screenshot",
      id: "player",
      flow: "store-02-player",
      headline: { "en-US": "Immersive Audio Player" },
      subhead: { "en-US": "Distraction-free pure dark player with synchronized verse display." },
    },
    {
      kind: "screenshot",
      id: "sounds",
      flow: "store-03-sounds",
      headline: { "en-US": "Ambient Soundscapes" },
      subhead: { "en-US": "Blend gentle rain, ocean waves, and nature audio with recitation." },
    },
    {
      kind: "screenshot",
      id: "reciters",
      flow: "store-04-reciters",
      headline: { "en-US": "World-Renowned Reciters" },
      subhead: { "en-US": "Listen to the world's most beloved scholars and reciters." },
    },
    {
      kind: "screenshot",
      id: "insights",
      flow: "store-05-insights",
      headline: { "en-US": "Build a Daily Habit" },
      subhead: { "en-US": "Track your listening streak, daily minutes, and weekly goals." },
    },
    {
      kind: "preview",
      id: "preview",
      segments: [
        { id: "home-explore", flow: "store-preview-01-home" },
        { id: "player-listen", flow: "store-preview-02-player", holdSeconds: 3 },
      ],
    },
  ],
};

export default config;
