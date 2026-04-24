export const ROOM_SUGGESTION_KEYS = [
  "bedroom",
  "kitchen",
  "bathroom",
  "livingRoom",
  "garage",
  "storage",
  "office",
  "diningRoom",
] as const;

export type RoomSuggestionKey = (typeof ROOM_SUGGESTION_KEYS)[number];
