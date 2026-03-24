
export function buildStoryBlurbPrompt({ userPrompt, playerCount }){
return {
system: `You create high quality murder mystery story premises.
Avoid generic phrasing.
Every sentence must add concrete information.
No filler.`,
user: `Create a murder mystery game summary.

About: ${userPrompt}

Requirements:
- ${playerCount} named characters
- one murder
- missing fortune
- clear physical location
- concrete murder method
- hidden truth location

Rules:
- no vague language
- no generic phrases
- no gameplay talk
- no instructions
- no lists
- one paragraph only`
};
}
