/** Short-lived persisted observations for cold-resume tests. */
import SessionQuery from '@deepseek-ai/dsh-session-query'
import type { SessionObservation, SessionObservationOptions } from '@deepseek-ai/dsh-session-query'
import type { SessionId, SessionHeader, SessionEvent, SessionLogOffset } from '@deepseek-ai/dsh-session'

export class FixtureSessionQuery extends SessionQuery {
  static override inject = ['sessions', 'sessionPersistence']
  override async observeSession(id: SessionId, options: SessionObservationOptions = {}): Promise<SessionObservation> {
    const live = this.ctx.sessions.get(id)
    let header: SessionHeader
    let events: readonly SessionEvent[]
    let inheritedEventCount: SessionLogOffset
    if (live !== undefined) {
      header = live.header
      events = live.snapshotEvents()
      inheritedEventCount = live.inheritedEventCount
    } else {
      const handle = await this.ctx.sessionPersistence.open(id, 'read', options.signal === undefined ? {} : { signal: options.signal })
      try {
        const stored = await handle.read()
        header = handle.header
        events = stored.events
        inheritedEventCount = stored.inheritedEventCount
      } finally { await handle.close() }
    }
    const retain = (): SessionObservation => ({ source: live === undefined ? 'prepared' : 'live', header, events,
      inheritedEventCount, cursor: events.at(-1)?.seq ?? -1, retain, [Symbol.dispose]: () => {} })
    return retain()
  }
  override searchSessions(): Promise<never> { return Promise.reject(new Error('Fixture does not search')) }
  override searchEvents(): Promise<never> { return Promise.reject(new Error('Fixture does not search')) }
}
