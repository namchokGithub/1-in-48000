type Character = { id: string; isNarrator?: boolean }

// A line without a speaker is narration, spoken by the narrator character.
export function lineSpeaker<T extends Character>(
  line: { speakerId?: string },
  characters: T[],
): T | undefined {
  return line.speakerId
    ? characters.find((character) => character.id === line.speakerId)
    : characters.find((character) => character.isNarrator)
}
