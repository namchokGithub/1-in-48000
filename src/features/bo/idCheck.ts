import { v2IdSchema } from '../../content/v2/schema'

// The problem with an item ID, or null when it is valid. otherIds are the
// IDs of the other items in the same list.
export function idProblem(id: string, otherIds: string[]): string | null {
  if (!v2IdSchema.safeParse(id).success)
    return 'ID ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก a-z'
  if (otherIds.includes(id)) return 'ID นี้ซ้ำกับรายการอื่น'
  return null
}
