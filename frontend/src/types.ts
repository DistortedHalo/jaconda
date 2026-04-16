export type ViewMode = "home" | "learnMore";

export type SiteContent = {
  homeHero: string;
  homeIntro: string;
  homeSectionTitle: string;
  homeSourcingOverlay: string;
  learnHero: string;
  learnLibraryHeading: string;
  learnLibraryBody: string;
  footerTagline: string;
  footerLocation: string;
  footerPartnership: string;
  footerPartners: string;
  rotatingWords: string[];
};

export type HomeActionHandlers = {
  onLearnMore: () => void;
  onSubmitBrief: () => void;
  onHome: () => void;
  content: SiteContent;
};

export type Track = {
  id: string;
  code: string;
  trackName?: string;
  artist: string;
  duration: string;
  mood?: string;
  bpm?: number | null;
  audioUrl: string;
  waveformSource?: string;
  sourceType?: "audio" | "soundcloud" | "spotify" | "youtube" | "embed";
};

export type SubmitFlowState = {
  brand: string;
  agency: string;
  campaignTitle: string;
  creativeBrief: string;
  genres: string[];
  moods: string[];
  duration: string;
  natureOfUse: string;
  media: string;
  territory: string;
  licenseAgreementTerm: string;
  commencementDate: string;
  campaignBudget: string;
  mediaSpendBudget: string;
};
