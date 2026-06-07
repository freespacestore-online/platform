# @freespacestore/sdk

FreeSpaceStore SDK -- orbital mechanics, Hohmann transfers, and the Tsiolkovsky rocket equation.

## Installation

```bash
npm install @freespacestore/sdk
```

## Orbital Mechanics

Create orbits, compute transfer maneuvers, and calculate rocket performance with real physics (vis-viva equation, Kepler's laws).

### Earth Orbits

```typescript
import { Orbit } from '@freespacestore/sdk';

// ISS orbit (408 km altitude, 51.6 deg inclination)
const iss = new Orbit({ altitude: 408, inclination: 51.6 });

console.log(iss.period);          // ~5554 seconds (~92 min)
console.log(iss.velocity);        // ~7.67 km/s
console.log(iss.semiMajorAxis);   // 6779 km
console.log(iss.apogee);          // 6779 km (circular)
console.log(iss.perigee);         // 6779 km (circular)

// Eccentric orbit
const molniya = new Orbit({ altitude: 500, eccentricity: 0.74, inclination: 63.4 });
console.log(molniya.apogee);     // high apogee over Russia
console.log(molniya.perigee);    // low perigee
```

### Hohmann Transfer

```typescript
import { Orbit } from '@freespacestore/sdk';

const leo = new Orbit({ altitude: 200 });
const geo = new Orbit({ altitude: 35786 });

const transfer = Orbit.hohmannTransfer(leo, geo);
console.log(transfer.deltaV1);      // ~2.46 km/s (first burn)
console.log(transfer.deltaV2);      // ~1.48 km/s (circularize)
console.log(transfer.totalDeltaV);  // ~3.94 km/s
console.log(transfer.transferTime); // ~19,077 seconds (~5.3 hours)
```

### Planetary Orbits

```typescript
import { Orbit } from '@freespacestore/sdk';

const earth = Orbit.fromPlanet('earth');
const mars = Orbit.fromPlanet('mars');

console.log(earth.period / 86400);  // ~365.25 days
console.log(mars.period / 86400);   // ~687 days

// Earth-Mars Hohmann transfer
const trip = Orbit.hohmannTransfer(earth, mars);
console.log(trip.transferTime / 86400);  // ~259 days
console.log(trip.totalDeltaV);           // km/s
```

### Position Along Orbit

```typescript
// Get 3D position at a given true anomaly (radians)
const pos = iss.position(Math.PI / 4);  // 45 degrees
console.log(pos.x, pos.y, pos.z);       // km from focus
```

## Rocket Equation

Tsiolkovsky's equation for delta-v, mass ratio, and fuel fraction.

```typescript
import { RocketEquation } from '@freespacestore/sdk';

// Merlin 1D: Isp 282s sea level -> Ve = 282 * 9.81 = 2766 m/s
const ve = 282 * 9.81;  // m/s

// Falcon 9 first stage: wet 433t, dry 26t
const dv = RocketEquation.deltaV(ve, 433000, 26000);
console.log(dv);  // ~7888 m/s

// How much fuel do you need for 3 km/s delta-v?
const ratio = RocketEquation.requiredMassRatio(3000, ve);
console.log(ratio);  // ~2.96x mass ratio

const fuel = RocketEquation.fuelFraction(3000, ve);
console.log(fuel);   // ~0.66 (66% of total mass must be fuel)
```

## API Reference

### `Orbit`

| Property/Method | Returns | Description |
|----------------|---------|-------------|
| `period` | `number` | Orbital period in seconds |
| `velocity` | `number` | Orbital velocity in km/s |
| `apogee` | `number` | Apogee radius in km |
| `perigee` | `number` | Perigee radius in km |
| `semiMajorAxis` | `number` | Semi-major axis in km |
| `position(anomaly)` | `{x,y,z}` | 3D position at true anomaly (radians) |
| `toJSON()` | `object` | All orbital elements |
| `Orbit.hohmannTransfer(from, to)` | `object` | Delta-v and transfer time |
| `Orbit.fromPlanet(name)` | `Orbit` | Heliocentric orbit for Mercury--Neptune |

### `RocketEquation`

| Method | Returns | Description |
|--------|---------|-------------|
| `deltaV(ve, wet, dry)` | `number` | Tsiolkovsky delta-v |
| `requiredMassRatio(dv, ve)` | `number` | Wet/dry mass ratio needed |
| `fuelFraction(dv, ve)` | `number` | Fuel as fraction of total mass (0--1) |

## License

MIT
