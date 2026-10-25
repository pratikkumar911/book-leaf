export class CircuitBreaker {
  constructor(name, { threshold = 5, windowMs = 60_000, cooldownMs = 5 * 60_000 } = {}) {
    this.name = name; this.threshold = threshold; this.windowMs = windowMs;
    this.cooldownMs = cooldownMs; this.state = 'closed';
    this.failures = []; this.openedAt = null;
  }
  canCall() {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'half-open';
        console.log(`[circuit:${this.name}] half-open`);
        return true;
      }
      return false;
    }
    return true; // half-open probe
  }
  recordSuccess() {
    if (this.state !== 'closed') console.log(`[circuit:${this.name}] closed`);
    this.state = 'closed'; this.failures = []; this.openedAt = null;
  }
  recordFailure(isTransient = true) {
    if (!isTransient) return;
    const now = Date.now();
    this.failures = this.failures.filter(t => now - t < this.windowMs);
    this.failures.push(now);
    if (this.failures.length >= this.threshold) {
      this.state = 'open'; this.openedAt = now;
      console.warn(`[circuit:${this.name}] OPEN for ${this.cooldownMs}ms`);
    }
  }
}

export const breakers = {
  classify: new CircuitBreaker('classify'),
  draft: new CircuitBreaker('draft'),
};