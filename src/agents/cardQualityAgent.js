
export async function cardQualityAgent(context) {
  const clues = context.clues || []

  // remove empty clues
  context.clues = clues.filter(
    c => c && c.title && c.information
  )

  return context
}
