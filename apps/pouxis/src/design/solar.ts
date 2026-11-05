/**
 * Solar position after the NOAA Solar Calculator equations (Meeus, "Astronomical Algorithms").
 * Accurate to roughly ±0.01° for dates between 1800 and 2100 — far beyond what a theme needs.
 * Works on absolute instants (epoch ms), so no time zone is involved.
 */

export interface GeoPoint {
  /** Degrees, north positive. */
  latitude: number;
  /** Degrees, east positive. */
  longitude: number;
}

export interface SolarPosition {
  /** Apparent elevation above the horizon in degrees, refraction included. */
  elevation: number;
  /** Azimuth in degrees clockwise from north. */
  azimuth: number;
  /** Solar declination in degrees. */
  declination: number;
  /** Equation of time in minutes (apparent minus mean solar time). */
  equationOfTime: number;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const sin = (d: number) => Math.sin(d * RAD);
const cos = (d: number) => Math.cos(d * RAD);
const tan = (d: number) => Math.tan(d * RAD);

/** Julian centuries since J2000.0 for an instant. */
export function julianCentury(epochMs: number): number {
  const julianDay = epochMs / 86_400_000 + 2_440_587.5;
  return (julianDay - 2_451_545) / 36_525;
}

/** Declination (°) and equation of time (min) for a Julian century. */
export function solarCoordinates(t: number): { declination: number; equationOfTime: number } {
  const meanLong = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const center =
    sin(meanAnomaly) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sin(2 * meanAnomaly) * (0.019993 - 0.000101 * t) +
    sin(3 * meanAnomaly) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const apparentLong = meanLong + center - 0.00569 - 0.00478 * sin(omega);
  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * cos(omega);
  const declination = Math.asin(sin(obliquity) * sin(apparentLong)) * DEG;
  const y = tan(obliquity / 2) ** 2;
  const eot =
    y * sin(2 * meanLong) -
    2 * eccentricity * sin(meanAnomaly) +
    4 * eccentricity * y * sin(meanAnomaly) * cos(2 * meanLong) -
    0.5 * y * y * sin(4 * meanLong) -
    1.25 * eccentricity * eccentricity * sin(2 * meanAnomaly);
  return { declination, equationOfTime: 4 * eot * DEG };
}

/** NOAA's piecewise approximation of atmospheric refraction, in degrees. */
export function refraction(elevation: number): number {
  if (elevation > 85) return 0;
  const te = tan(elevation);
  let arcsec: number;
  if (elevation > 5) arcsec = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (elevation > -0.575)
    arcsec =
      1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
  else arcsec = -20.774 / te;
  return arcsec / 3600;
}

export function solarPosition(epochMs: number, at: GeoPoint): SolarPosition {
  const { declination, equationOfTime } = solarCoordinates(julianCentury(epochMs));
  const utcMinutes = (((epochMs % 86_400_000) + 86_400_000) % 86_400_000) / 60_000;
  const trueSolarTime = (((utcMinutes + equationOfTime + 4 * at.longitude) % 1440) + 1440) % 1440;
  const hourAngle = trueSolarTime / 4 - 180;
  const cosZenith = Math.min(
    1,
    Math.max(
      -1,
      sin(at.latitude) * sin(declination) + cos(at.latitude) * cos(declination) * cos(hourAngle),
    ),
  );
  const zenith = Math.acos(cosZenith) * DEG;
  const geometric = 90 - zenith;
  const azDenominator = cos(at.latitude) * sin(zenith);
  let azimuth: number;
  if (Math.abs(azDenominator) < 1e-9) {
    azimuth = at.latitude > 0 ? 180 : 0;
  } else {
    const cosAz = (sin(at.latitude) * cosZenith - sin(declination)) / azDenominator;
    const a = Math.acos(Math.min(1, Math.max(-1, cosAz))) * DEG;
    azimuth = hourAngle > 0 ? (a + 180) % 360 : (540 - a) % 360;
  }
  return { elevation: geometric + refraction(geometric), azimuth, declination, equationOfTime };
}
