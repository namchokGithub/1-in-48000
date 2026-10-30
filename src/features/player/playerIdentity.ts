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
