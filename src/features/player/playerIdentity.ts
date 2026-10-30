import { V2_DEFAULT_OUTFIT, type V2Outfit } from '../../content/v2/schema'

type NamedPortrait = {
  id: string
  portraits?: Partial<Record<V2Outfit, string>>
}
type Asset = { id: string; kind: string; path: string }

export function playerPortraitPath(
  names: NamedPortrait[],
  assets: Asset[],
  nameId: string,
  outfit: V2Outfit = V2_DEFAULT_OUTFIT,
): string | undefined {
  const portraitId = names.find((name) => name.id === nameId)?.portraits?.[
    outfit
  ]
  return assets.find(
    (asset) => asset.id === portraitId && asset.kind === 'portrait',
  )?.path
}

type Named = { id: string; name: string }

// "คณะ · สาขา" once both are chosen; undefined before that.
export function playerProgram(
  faculties: Named[],
  majors: Named[],
  facultyId: string | null,
  majorId: string | null,
): string | undefined {
  const faculty = faculties.find((item) => item.id === facultyId)
  const major = majors.find((item) => item.id === majorId)
  return faculty && major ? `${faculty.name} · ${major.name}` : undefined
}

// An NPC speaker stands on the left of the scene and the player on the right;
// the narrator stands beside the dialogue box instead. A line that already
// shows the player's own picture leaves it on the player's side.
export function scenePortraits({
  speakerPath,
  speakerIsNarrator,
  playerPath,
  hidePlayer,
}: {
  speakerPath: string | undefined
  speakerIsNarrator: boolean
  playerPath: string | undefined
  hidePlayer: boolean
}): {
  speaker: string | undefined
  narrator: string | undefined
  player: string | undefined
} {
  const player = hidePlayer ? undefined : playerPath
  const shown = speakerPath && speakerPath === player ? undefined : speakerPath
  return {
    speaker: speakerIsNarrator ? undefined : shown,
    narrator: speakerIsNarrator ? shown : undefined,
    player,
  }
}
