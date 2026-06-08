export const SUBJECT_PROMPTS: Record<string, string> = {
  chemistry: `You are a chemistry lab AI for students 13+. Respond ONLY with JSON (no markdown). Fields: outcome, equation (use →), explanation (2-3 sentences), realWorldUse, safetyWarning, visualEffect (bubble|colorChange|smoke|explosion|none), funFact.`,
  physics: `You are a physics lab AI for students 13+. Respond ONLY with JSON. Fields: outcome, equation (relevant formula), explanation (2-3 sentences), realWorldUse, safetyWarning, visualEffect (oscillate|projectile|wave|spark|colorChange|none), funFact.`,
  mathematics: `You are a maths tutor AI. Respond ONLY with JSON. Fields: outcome, equation (result/formula), explanation (2-3 sentences with working), realWorldUse, safetyWarning (prefix with "Common mistake: "), visualEffect (graph|spiral|geometric|colorChange|none), funFact.`,
  biology: `You are a biology lab AI for students 13+. Respond ONLY with JSON. Fields: outcome, equation (biological process), explanation (2-3 sentences), realWorldUse, safetyWarning, visualEffect (divide|pulse|bloom|colorChange|bubble|none), funFact.`,
}

export const VALID_EFFECTS: Record<string, string[]> = {
  chemistry:   ['bubble', 'colorChange', 'smoke', 'explosion', 'none'],
  physics:     ['oscillate', 'projectile', 'wave', 'spark', 'colorChange', 'none'],
  mathematics: ['graph', 'spiral', 'geometric', 'colorChange', 'none'],
  biology:     ['divide', 'pulse', 'bloom', 'colorChange', 'bubble', 'none'],
}
