export interface Campaign {
  id: string;
  name: string;
}

export const mockCampaigns: Campaign[] = [
  { id: "camp_001", name: "Q1 Product Feedback" },
  { id: "camp_002", name: "Content Moderation Wave 1" },
  { id: "camp_003", name: "NPS Follow-up" },
  { id: "camp_004", name: "Data Labeling Batch A" },
  { id: "camp_005", name: "Transcription Pilot" },
  { id: "camp_006", name: "Survey: Checkout Flow" },
  { id: "camp_007", name: "Review: Social Q2" },
];

export function getCampaigns(): Campaign[] {
  return [...mockCampaigns];
}

export function searchCampaigns(query: string): Campaign[] {
  const q = query.trim().toLowerCase();
  if (!q) return mockCampaigns;
  return mockCampaigns.filter(
    (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
  );
}
