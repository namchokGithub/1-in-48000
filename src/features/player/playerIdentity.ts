type NamedPortrait = { id: string; portraitAssetId?: string }
type Asset = { id: string; kind: string; path: string }

export function playerPortraitPath(
  names: NamedPortrait[],
  assets: Asset[],
  nameId: string,
): string | undefined {
  const portraitId = names.find((name) => name.id === nameId)?.portraitAssetId
  return assets.find(
    (asset) => asset.id === portraitId && asset.kind === 'portrait',
  )?.path
}
