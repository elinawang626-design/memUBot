import { describe, expect, it } from 'vitest'
import {
  createHeuristicTopicScorer,
  decideTemporaryTopicTransition
} from '../temporary-topic'

describe('createHeuristicTopicScorer', () => {
  it('scores topic overlap without requiring an external API key', async () => {
    const scorer = createHeuristicTopicScorer()

    const result = await scorer(
      'Show the project roadmap and client deadline',
      'We discussed the project roadmap and the client deadline yesterday',
      'Dinner plans and movie night'
    )

    expect(result.relMain).toBeGreaterThan(result.relTemp)
    expect(result.relMain).toBeGreaterThan(0.5)
  })
})

describe('decideTemporaryTopicTransition with heuristic scorer', () => {
  it('enters a temporary topic when the query no longer matches the main thread', async () => {
    const scorer = createHeuristicTopicScorer()

    const transition = await decideTemporaryTopicTransition({
      mode: 'MAIN',
      query: 'What movie should we watch tonight?',
      mainTopicReference: 'Project roadmap, sprint goals, engineering deadline'
    }, scorer)

    expect(transition.decision).toBe('enter-temp')
  })

  it('exits a temporary topic when the query returns to the main thread', async () => {
    const scorer = createHeuristicTopicScorer()

    const transition = await decideTemporaryTopicTransition({
      mode: 'TEMP',
      query: 'Back to the sprint roadmap and engineering deadline',
      mainTopicReference: 'Project roadmap, sprint goals, engineering deadline',
      tempTopicReference: 'Movie night, dinner reservation, popcorn flavors'
    }, scorer)

    expect(transition.decision).toBe('exit-temp')
  })
})
