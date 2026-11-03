// Test-only helper. Tests combine the small sample content with the live
// player names, so the sample also carries the live portrait assets those
// names use. Renaming or adding a portrait in the content then never breaks
// a test that only needs valid names.
import liveAssets from '../../../public/content-v2/assets.json'
import names from '../../../public/content-v2/names.json'
import sampleContent from './sample-content.json'

const portraitIds = new Set(
  names.flatMap((name) => Object.values(name.portraits ?? {})),
)
const sampleIds = new Set(sampleContent.assets.map((asset) => asset.id))

export const sample = {
  ...sampleContent,
  assets: [
    ...sampleContent.assets,
    ...liveAssets.filter(
      (asset) => portraitIds.has(asset.id) && !sampleIds.has(asset.id),
    ),
  ],
}

export { names }
