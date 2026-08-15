// Demo mode mock data — used when NEXT_PUBLIC_DEMO_MODE=true

export const DEMO_USER = {
  id: "demo-user-001",
  email: "demo@decod3x.com",
};

export const DEMO_BALANCE = 47;

export const DEMO_SCANS = [
  {
    id: "scan-001",
    filename: "portrait_headshot.jpg",
    file_type: "image",
    prediction: "Fake",
    confidence: 0.943,
    fake_probability: 0.943,
    real_probability: 0.057,
    frames_analyzed: null,
    credits_used: 1,
    created_at: "2026-05-06T18:30:00Z",
  },
  {
    id: "scan-002",
    filename: "landscape_photo.png",
    file_type: "image",
    prediction: "Real",
    confidence: 0.891,
    fake_probability: 0.109,
    real_probability: 0.891,
    frames_analyzed: null,
    credits_used: 1,
    created_at: "2026-05-06T15:12:00Z",
  },
  {
    id: "scan-003",
    filename: "social_media_post.jpg",
    file_type: "image",
    prediction: "Fake",
    confidence: 0.876,
    fake_probability: 0.876,
    real_probability: 0.124,
    frames_analyzed: null,
    credits_used: 1,
    created_at: "2026-05-05T22:45:00Z",
  },
  {
    id: "scan-004",
    filename: "interview_clip.mp4",
    file_type: "video",
    prediction: "Real",
    confidence: 0.812,
    fake_probability: 0.188,
    real_probability: 0.812,
    frames_analyzed: 24,
    credits_used: 3,
    created_at: "2026-05-05T14:20:00Z",
  },
  {
    id: "scan-005",
    filename: "profile_pic.webp",
    file_type: "image",
    prediction: "Fake",
    confidence: 0.967,
    fake_probability: 0.967,
    real_probability: 0.033,
    frames_analyzed: null,
    credits_used: 1,
    created_at: "2026-05-04T09:30:00Z",
  },
  {
    id: "scan-006",
    filename: "product_photo.jpg",
    file_type: "image",
    prediction: "Real",
    confidence: 0.934,
    fake_probability: 0.066,
    real_probability: 0.934,
    frames_analyzed: null,
    credits_used: 1,
    created_at: "2026-05-03T20:15:00Z",
  },
  {
    id: "scan-007",
    filename: "deepfake_test.mp4",
    file_type: "video",
    prediction: "Fake",
    confidence: 0.991,
    fake_probability: 0.991,
    real_probability: 0.009,
    frames_analyzed: 18,
    credits_used: 3,
    created_at: "2026-05-02T11:00:00Z",
  },
];

export const DEMO_PREDICT_RESULT = {
  type: "image",
  prediction: "Fake",
  confidence: 0.943,
  fake_probability: 0.943,
  real_probability: 0.057,
  creditsUsed: 1,
  creditsRemaining: 46,
};

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
