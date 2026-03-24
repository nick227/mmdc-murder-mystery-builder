
export type EvidenceStrength = "weak" | "supporting" | "strong" | "decisive";

export interface MysteryCard {
  card_type: string;
  card_title: string;
  card_contents: string;
  act: number;

  // new fields
  clue_id?: string;
  evidence_strength?: EvidenceStrength;
  requires?: string[];
}
