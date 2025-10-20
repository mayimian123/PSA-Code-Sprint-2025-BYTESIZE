export const IMAGE_PATHS = {
  landingBackground: "/images/landing-bg.jpg",
  loginBackground: "/images/login-bg.jpg",
  homeMap: "/images/home-page.jpg",
  loginVisual: "/images/login-visual.svg",
  psaTalk: "/images/icon-psaitalk.svg",
  connect: "/images/icon-connect.svg",
  learning: "/images/icon-learning.svg",
  learningBackdrop: "/images/learning-bg.jpg",
  career: "/images/icon-career.svg",
  wellness: "/images/icon-wellness.svg",
  account: "/images/icon-account.png",
} as const;

export const BRUSH_COLORS = {
  teal: "#1B8CA6",
  aqua: "#1BAFBF",
  sage: "#88A699",
  copper: "#A66151",
  mist: "#F2F2F2",
} as const;

export const MODULE_ROUTES = [
  {
    key: "psai-talk",
    label: "PSAiTalk",
    path: "/modules/psai-talk",
    image: IMAGE_PATHS.psaTalk,
  },
  {
    key: "connect",
    label: "Connect@PSA",
    path: "/modules/connect",
    image: IMAGE_PATHS.connect,
  },
  {
    key: "learning-hub",
    label: "Learning Hub",
    path: "/modules/learning-hub",
    image: IMAGE_PATHS.learning,
  },
  {
    key: "career-navigator",
    label: "Career Navigator",
    path: "/modules/career-navigator",
    image: IMAGE_PATHS.career,
  },
  {
    key: "wellness",
    label: "Wellness",
    path: "/modules/wellness",
    image: IMAGE_PATHS.wellness,
  },
  {
    key: "account",
    label: "Account",
    path: "/modules/account",
    image: IMAGE_PATHS.account,
  },
] as const;

export const LEARNING_HUB_FIELDS = [
  "Commercial & Business Development",
  "Technology & Engineering",
  "Operations & Supply Chain",
  "Data & Digital Intelligence",
  "Corporate Strategy & People",
] as const;
