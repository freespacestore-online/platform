/**
 * FreeSpaceStore Orbital Mechanics SDK
 * Keplerian orbits, Hohmann transfers, Tsiolkovsky rocket equation
 */

// Constants
const G = 6.674e-11;              // gravitational constant (m^3 kg^-1 s^-2)
const M_EARTH = 5.972e24;         // kg
const R_EARTH = 6371;             // km
const MU_EARTH = 3.986e5;         // km^3/s^2 (standard gravitational parameter)
const MU_SUN = 1.327e11;          // km^3/s^2

// Planet data: semiMajorAxis (km from Sun), eccentricity, inclination (deg)
const PLANETS: Record<string, { a: number; e: number; i: number }> = {
  mercury:  { a: 57.909e6,  e: 0.2056, i: 7.00 },
  venus:    { a: 108.21e6,  e: 0.0068, i: 3.39 },
  earth:    { a: 149.60e6,  e: 0.0167, i: 0.00 },
  mars:     { a: 227.94e6,  e: 0.0934, i: 1.85 },
  jupiter:  { a: 778.57e6,  e: 0.0489, i: 1.31 },
  saturn:   { a: 1433.5e6,  e: 0.0565, i: 2.49 },
  uranus:   { a: 2872.5e6,  e: 0.0457, i: 0.77 },
  neptune:  { a: 4495.1e6,  e: 0.0113, i: 1.77 },
};

export class Orbit {
  /** Semi-major axis in km */
  readonly semiMajorAxis: number;
  /** Eccentricity (0 = circular) */
  readonly eccentricity: number;
  /** Inclination in degrees */
  readonly inclination: number;
  /** Gravitational parameter in km^3/s^2 */
  private mu: number;

  /**
   * Create an Earth orbit from altitude parameters, or a heliocentric orbit
   * by providing `mu` in the params.
   */
  constructor(params: {
    altitude?: number;
    semiMajorAxis?: number;
    inclination?: number;
    eccentricity?: number;
    mu?: number;
  }) {
    this.eccentricity = params.eccentricity ?? 0;
    this.inclination = params.inclination ?? 0;
    this.mu = params.mu ?? MU_EARTH;

    if (params.semiMajorAxis != null) {
      this.semiMajorAxis = params.semiMajorAxis;
    } else if (params.altitude != null) {
      // altitude is above Earth's surface; convert to semi-major axis
      this.semiMajorAxis = R_EARTH + params.altitude;
    } else {
      throw new Error('Provide either altitude or semiMajorAxis');
    }
  }

  /** Orbital period in seconds */
  get period(): number {
    return 2 * Math.PI * Math.sqrt(Math.pow(this.semiMajorAxis, 3) / this.mu);
  }

  /** Orbital velocity at a given distance (defaults to semi-major axis) in km/s */
  velocityAt(r?: number): number {
    r = r ?? this.semiMajorAxis;
    // Vis-viva equation: v = sqrt(mu * (2/r - 1/a))
    return Math.sqrt(this.mu * (2 / r - 1 / this.semiMajorAxis));
  }

  /** Mean orbital velocity in km/s (circular approximation) */
  get velocity(): number {
    return this.velocityAt(this.semiMajorAxis);
  }

  /** Apogee radius in km (from center of body) */
  get apogee(): number {
    return this.semiMajorAxis * (1 + this.eccentricity);
  }

  /** Perigee radius in km (from center of body) */
  get perigee(): number {
    return this.semiMajorAxis * (1 - this.eccentricity);
  }

  /**
   * Compute position in the orbital plane at a given true anomaly (radians).
   * Returns {x, y, z} in km. The z-component accounts for inclination.
   */
  position(trueAnomaly: number): { x: number; y: number; z: number } {
    const e = this.eccentricity;
    // Distance from focus
    const r = (this.semiMajorAxis * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));

    // Position in orbital plane
    const xPlane = r * Math.cos(trueAnomaly);
    const yPlane = r * Math.sin(trueAnomaly);

    // Rotate by inclination around x-axis
    const incRad = (this.inclination * Math.PI) / 180;
    return {
      x: Math.round(xPlane * 1000) / 1000,
      y: Math.round(yPlane * Math.cos(incRad) * 1000) / 1000,
      z: Math.round(yPlane * Math.sin(incRad) * 1000) / 1000,
    };
  }

  /**
   * Hohmann transfer between two coplanar circular orbits.
   * Both orbits must share the same gravitational parameter.
   */
  static hohmannTransfer(from: Orbit, to: Orbit): {
    deltaV1: number;
    deltaV2: number;
    totalDeltaV: number;
    transferTime: number;
  } {
    const mu = from.mu;
    const r1 = from.semiMajorAxis;
    const r2 = to.semiMajorAxis;
    const aTransfer = (r1 + r2) / 2;

    // Velocities at departure and arrival orbits (circular)
    const v1Circular = Math.sqrt(mu / r1);
    const v2Circular = Math.sqrt(mu / r2);

    // Transfer orbit velocities at periapsis and apoapsis (vis-viva)
    const vTransfer1 = Math.sqrt(mu * (2 / r1 - 1 / aTransfer));
    const vTransfer2 = Math.sqrt(mu * (2 / r2 - 1 / aTransfer));

    const deltaV1 = Math.abs(vTransfer1 - v1Circular);
    const deltaV2 = Math.abs(v2Circular - vTransfer2);
    const transferTime = Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / mu);

    return {
      deltaV1: Math.round(deltaV1 * 10000) / 10000,
      deltaV2: Math.round(deltaV2 * 10000) / 10000,
      totalDeltaV: Math.round((deltaV1 + deltaV2) * 10000) / 10000,
      transferTime: Math.round(transferTime),
    };
  }

  /**
   * Create a heliocentric orbit for a named planet (Mercury through Neptune).
   */
  static fromPlanet(name: string): Orbit {
    const key = name.toLowerCase();
    const data = PLANETS[key];
    if (!data) throw new Error(`Unknown planet: ${name}. Use Mercury through Neptune.`);
    return new Orbit({
      semiMajorAxis: data.a,
      eccentricity: data.e,
      inclination: data.i,
      mu: MU_SUN,
    });
  }

  toJSON(): object {
    return {
      semiMajorAxis: this.semiMajorAxis,
      eccentricity: this.eccentricity,
      inclination: this.inclination,
      period: this.period,
      velocity: this.velocity,
      apogee: this.apogee,
      perigee: this.perigee,
    };
  }
}

/**
 * Tsiolkovsky rocket equation utilities.
 */
export class RocketEquation {
  /**
   * Calculate delta-v from the rocket equation.
   * @param exhaustVelocity Effective exhaust velocity in m/s (or km/s — units match output)
   * @param wetMass Total mass with fuel (kg)
   * @param dryMass Mass without fuel (kg)
   * @returns delta-v in same units as exhaustVelocity
   */
  static deltaV(exhaustVelocity: number, wetMass: number, dryMass: number): number {
    if (dryMass <= 0 || wetMass < dryMass) throw new Error('wetMass must be > dryMass > 0');
    return exhaustVelocity * Math.log(wetMass / dryMass);
  }

  /**
   * Required mass ratio (wet/dry) to achieve a given delta-v.
   */
  static requiredMassRatio(deltaV: number, exhaustVelocity: number): number {
    return Math.exp(deltaV / exhaustVelocity);
  }

  /**
   * Fuel fraction: what fraction of total mass must be fuel.
   * Returns a value between 0 and 1.
   */
  static fuelFraction(deltaV: number, exhaustVelocity: number): number {
    return 1 - 1 / RocketEquation.requiredMassRatio(deltaV, exhaustVelocity);
  }
}
