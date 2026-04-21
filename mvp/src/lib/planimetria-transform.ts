// Trasformazione affine 2D da planimetria (x,y in 0..1) a coordinate GPS.
// Con 2 punti ancora (planimetria ↔ GPS) deriviamo scala + rotazione + traslazione
// assumendo rapporto lat/lng proporzionale (isotropo).
//
// Approssimazione adeguata per un sito culturale di qualche centinaio di metri.
// Non valida per scale geografiche grandi (>10km).

export interface Anchor {
  planX: number; // 0..1 sulla planimetria
  planY: number; // 0..1 sulla planimetria (y cresce verso il basso)
  lat: number;
  lng: number;
}

export interface AffineParams {
  // lat = a * x + b * y + c
  // lng = d * x + e * y + f
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Calcola i parametri affine da 2 ancore.
 * Con 2 punti abbiamo 4 equazioni per 6 incognite → sottodeterminato.
 * Assumiamo che la trasformazione sia una similitudine (scala + rotazione + traslazione),
 * non skew/shear separati. Questo riduce a 4 incognite e 2 ancore bastano.
 *
 * Deriviamo dalla coppia di vettori (planA→planB, gpsA→gpsB):
 *   vettoreGps = R * scala * vettorePlan
 *
 * Poi traslazione: A_gps = R * scala * A_plan + T
 */
export function affineFrom2Anchors(
  a1: Anchor,
  a2: Anchor,
): AffineParams | null {
  const dx = a2.planX - a1.planX;
  const dy = a2.planY - a1.planY;
  const dLat = a2.lat - a1.lat;
  const dLng = a2.lng - a1.lng;

  const planDist2 = dx * dx + dy * dy;
  if (planDist2 < 1e-9) return null;

  // Correggere per fattore cos(latitudine) perché 1° lng ≠ 1° lat.
  // Lavoriamo in uno spazio locale "metri equivalenti" per stimare rotazione corretta.
  const latRef = (a1.lat + a2.lat) / 2;
  const lngFactor = Math.cos((latRef * Math.PI) / 180);

  // Vettore GPS in "spazio isotropo"
  const gpsDxIso = dLng * lngFactor;
  const gpsDyIso = dLat;

  // Scala e rotazione dal rapporto di distanze + angolo tra i vettori
  const gpsNorm = Math.sqrt(gpsDxIso * gpsDxIso + gpsDyIso * gpsDyIso);
  const planNorm = Math.sqrt(planDist2);
  const scale = gpsNorm / planNorm;

  // Angolo di rotazione dal vettore planimetria al vettore GPS
  const planAngle = Math.atan2(dy, dx);
  const gpsAngle = Math.atan2(gpsDyIso, gpsDxIso);
  const rot = gpsAngle - planAngle;

  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  // Matrice di trasformazione in spazio isotropo
  //   x_iso = scale * (cos*planX - sin*planY) + tx_iso
  //   y_iso = scale * (sin*planX + cos*planY) + ty_iso
  //
  // Traslazione: a1 anchor deve mappare esattamente.
  const a1IsoX = scale * (cos * a1.planX - sin * a1.planY);
  const a1IsoY = scale * (sin * a1.planX + cos * a1.planY);
  const tx_iso = a1.lng * lngFactor - a1IsoX;
  const ty_iso = a1.lat - a1IsoY;

  // Converti i parametri per dare output finale:
  // lat = a*x + b*y + c; lng = d*x + e*y + f (in coordinate geografiche vere)
  const a = scale * sin;
  const b = scale * cos;
  const c = ty_iso;
  const d = (scale * cos) / lngFactor;
  const e = (-scale * sin) / lngFactor;
  const f = tx_iso / lngFactor;

  return { a, b, c, d, e, f };
}

export function applyAffine(
  params: AffineParams,
  planX: number,
  planY: number,
): { lat: number; lng: number } {
  const lat = params.a * planX + params.b * planY + params.c;
  const lng = params.d * planX + params.e * planY + params.f;
  return { lat, lng };
}
