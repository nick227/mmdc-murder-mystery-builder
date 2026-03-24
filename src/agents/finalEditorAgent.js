
function dedupe(clues) {
  const seen = new Set()
  return clues.filter(c => {
    const key = (c.title + c.information).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function finalEditorAgent(context) {
  if (context.clues) {
    context.clues = dedupe(context.clues)
  }

  return context
}
