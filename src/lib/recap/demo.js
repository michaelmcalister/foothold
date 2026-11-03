// A sample run for the demo recap and the "try it now" demo (#/try): about
// 11 km from Circular Quay, up through The Rocks and over the Sydney Harbour
// Bridge, a loop of Kirribilli, back over the bridge, a loop of the Royal
// Botanic Garden by Farm Cove, then a lap of the Opera House and home. The route was traced on
// OpenStreetMap footpaths (© OpenStreetMap contributors, ODbL) with the
// FOSSGIS foot router and stored as an encoded polyline.
// The run has a slower climb up the bridge stairs, a quicker stretch on the
// way back, a short wait at the lights and sample heart rate and cadence, so
// the report has something to show. It's labelled as a demo wherever it
// appears. Heights aren't baked in: the report looks them up like any run.
import { distance, summarise } from '../engine/index.js'
import { decodePolyline } from '../engine/strongholds.js'

const ROUTE = "|ntmEgk|y[B?J@?LGdA?LAPE`AANANAVAFADEFGFE@IBKBQ?OAOA[Cc@CuAKWEe@GQCCZA@A^?D?D?B?B?DOnA@D@@?D?BSAAH?FGj@AJK`A@FE@EBCDCBCFAB?B?BE`@MpACAKK?BDH?B?BQGk@Sj@RPFB@^J@@B@BBBBXH?@CJAHABOEGCOG_@KOGADALCH?@ENSKaAk@iR_KuA}@g@WqIsEmOiIe@UYM[My@Ym@KwAWmBK{ABo@Fk@Dq@HcALAIA?C???DA?AFAN@`@Gv@I@?JCLCDATE?HE@FrAGsADA?If@IrAWjCW?G?GAG?GHCFAK}ADAj@ErAMD?FAB?FCB@?C\\PFUGT]Q?BCA@]Fc@BKFGBGD]DM@CJa@DM?AFSFS?EBIDQ@O?E?E@C@EDC@ABGBA@ABCBCJE@??ABEJMBGWSCICKAEjBgA{Ai@HEKENQT_AMETaAH[l@_CmD_A]Ga@Go@IKJk@v@g@j@KKEC_@[^ZELEHFDFFk@fACDOVaAbBa@v@u@fAGHEHGHAB}@lAi@r@IJLvBJrBHALtB?J@LH|A@J?D@@?J@L@DTE?HE@FrAGsADA?IUDE@MBKBA?w@Ha@FOAG@?@E@??B?@?@HbAMp@Ij@En@GzAClBJvAVl@Jx@XZLXLd@TlOhIpIrEf@VtA|@hR~J`Aj@RJDO?ABI@M@ENF^JNFFBND@C@IBK?AYICCCCCAAA_@KCAQGk@Sj@RPF?C?CEI?CJJB@LqADa@?C?C@CBGBCBEDCDAAGJaA@KFk@?G@IR@?C?EAAAENoA?E?CB@N?XMJ@H??T?UBYhCL?G?A?KZBN@N@P?JCHCDAFGDG@E@G@W@O@ODaA@Q?MFeA?M@ODeA@S@IHcBM?]AKBJC\\@L?DYESIUIQ^k@@G?A?CAA@[@WBA?Co@E@C@OQAsAKOAqBQg@CIAH@f@BpBPN@@Y?GqCSaCWu@W]UW]a@q@Wi@CEUg@ACCKCI?G?G?E@K@CHq@AUR_@?SPQXa@V]V_@LYJUHMFGFKPQVUx@g@XOBA\\M\\Gr@C\\@h@D`@FlCd@NBVBV?|BpBVEVC@?\\G@HBFFD@BGHEDKFKBCAGRu@OA?Cf@@XDRHTHNJL?PC?A@A@AB?B?@@B@BQf@m@v@c@b@_@\\MLOJ^JP?BFz@KRAS@{@JCGQ?_@KQLSFGHGLWAM@k@?ILKPcA~ACBED?FAXOAqBQg@CIAH@f@BpBPN@@Y?GqCSaCWu@W]UW]a@q@Wi@CEUg@ACCKCI?G?G?E@K@CHq@AUa@GGCAWq@JC?eCg@a@GSQMMk@KGHMHQFODKJINENCVCT@P@PDVF`@BLCTLBvCj@fARB@d@Hn@LBUBOP_BNsADYFB`@F@TIp@ABAJ?D?F?FBHBJ@BTf@BDVh@`@p@V\\\\Tt@V`CVpCR?FAXOAqBQg@CIAH@f@BpBPN@rAJP@ANABn@D?BC@AVAZ@@?B?@AF_@j@HPHTDREXIbBAHAREdAANKAC?"

export const DEMO_PLACE = 'Over the Harbour Bridge'

// One point every few metres along the route, like a phone recording
function densify(pts, step = 8) {
  const out = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const d = distance(a, b)
    const n = Math.max(1, Math.round(d / step))
    for (let k = 1; k <= n; k++) out.push({ lat: a.lat + ((b.lat - a.lat) * k) / n, lng: a.lng + ((b.lng - a.lng) * k) / n })
  }
  return out.filter((p, i) => i === 0 || p.lat !== out[i - 1].lat || p.lng !== out[i - 1].lng)
}

// Seconds per km by how far round: The Rocks, the bridge stairs, the deck,
// Kirribilli's hills, back over the bridge, the garden, the Opera House, home
function paceAt(f) {
  if (f < 0.055) return 345
  if (f < 0.085) return 400
  if (f < 0.17) return 330
  if (f < 0.36) return 344
  if (f < 0.46) return 322
  if (f < 0.53) return 330
  if (f < 0.73) return 336
  if (f < 0.88) return 328
  return 310
}

export function demoRun(now = Date.now()) {
  const start = now - 2 * 3600000
  const pts = densify(decodePolyline(ROUTE))
  const total = pts.reduce((d, p, i) => d + (i ? distance(pts[i - 1], p) : 0), 0)
  let t = start
  let d = 0
  let stopped = false
  const track = []
  pts.forEach((p, i) => {
    if (i) {
      const step = distance(pts[i - 1], p)
      d += step
      t += (step / 1000) * paceAt(d / total) * 1000
    }
    const f = d / total
    const hr = Math.round(130 + 22 * Math.min(1, f * 3) + (f > 0.055 && f < 0.17 ? 9 : 0) + (f > 0.17 && f < 0.36 ? 5 : 0) + (f > 0.88 ? 10 : 0) + Math.sin(i / 4) * 2)
    const cad = (f > 0.88 ? 176 : f > 0.055 && f < 0.085 ? 150 : 170) + (i % 3) - 1
    track.push({ ...p, t: Math.round(t), hr, cad })
    // Lights by Circular Quay: about 40 seconds standing, a little GPS drift
    if (!stopped && f > 0.5) {
      stopped = true
      for (let k = 1; k <= 8; k++) track.push({ lat: p.lat + k * 2e-7, lng: p.lng - k * 1e-7, t: Math.round(t + k * 5000), hr: hr - k * 2, cad: 0 })
      t += 40000
    }
  })
  const s = summarise(track)
  return {
    activity: {
      id: 'demo',
      mode: 'run',
      startedAt: start,
      distanceM: s.distanceM,
      durationS: s.durationS,
      movingS: s.movingS ?? s.durationS,
      paceSPerKm: s.paceSPerKm ?? 335,
      demo: true,
    },
    track,
  }
}
