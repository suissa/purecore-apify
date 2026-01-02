import type { Attributes, MetricEnvelope } from "./types";
import { emitEnvelope } from "./exporter";

function emitMetric(env: MetricEnvelope) {
  void emitEnvelope(env);
}

class Counter {
  constructor(private readonly name: string, private readonly scope: string) {}

  add(value: number, attributes?: Attributes) {
    emitMetric({
      type: "metric",
      kind: "counter",
      name: `${this.scope}.${this.name}`,
      value,
      attributes,
      timestamp: new Date().toISOString()
    });
  }
}

class Histogram {
  constructor(private readonly name: string, private readonly scope: string) {}

  record(value: number, attributes?: Attributes) {
    emitMetric({
      type: "metric",
      kind: "histogram",
      name: `${this.scope}.${this.name}`,
      value,
      attributes,
      timestamp: new Date().toISOString()
    });
  }
}

class UpDownCounter {
  constructor(private readonly name: string, private readonly scope: string) {}

  add(value: number, attributes?: Attributes) {
    emitMetric({
      type: "metric",
      kind: "updown",
      name: `${this.scope}.${this.name}`,
      value,
      attributes,
      timestamp: new Date().toISOString()
    });
  }
}

class Meter {
  constructor(private readonly scopeName: string) {}

  createCounter(name: string) {
    return new Counter(name, this.scopeName);
  }

  createHistogram(name: string) {
    return new Histogram(name, this.scopeName);
  }

  createUpDownCounter(name: string) {
    return new UpDownCounter(name, this.scopeName);
  }
}

class MeterProvider {
  private meters = new Map<string, Meter>();

  getMeter(name: string): Meter {
    if (!this.meters.has(name)) {
      this.meters.set(name, new Meter(name));
    }
    return this.meters.get(name)!;
  }
}

const provider = new MeterProvider();

export const metrics = {
  getMeter(name: string): Meter {
    return provider.getMeter(name);
  }
};
