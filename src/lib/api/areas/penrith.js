// Practice rivals for Penrith and Jordan Springs: seven real local loops,
// traced on OpenStreetMap footpaths (© OpenStreetMap contributors, ODbL) with
// the FOSSGIS foot router, simplified to within 3 m and stored as encoded
// polylines. Used by the practice map when the player is in the area.

export const AREA = {
  id: 'penrith',
  name: 'Penrith and Jordan Springs',
  centre: { lat: -33.735, lng: 150.700 },
  radiusM: 15000,
  clubs: [
    { id: 'c-nepean', name: 'Nepean River Runners', members: ['r-sam', 'r-priya', 'r-tom'] },
    { id: 'c-jordan', name: 'Jordan Springs Joggers', members: ['r-jess', 'r-mei'] },
    { id: 'c-lakes', name: 'Lakes Saturday Crew', members: ['r-lachie'] },
  ],
  // Who runs what. Shared loops mean contested ground, like real life.
  regulars: {
    'r-sam': ['nepean-river', 'penrith-weir'],
    'r-priya': ['jamison-park', 'penrith-weir'],
    'r-tom': ['nepean-river', 'regatta'],
    'r-jess': ['jordan-springs-lake', 'wianamatta-trails'],
    'r-mei': ['wianamatta-trails', 'cranebrook'],
    'r-lachie': ['regatta', 'cranebrook'],
  },
}

export const LOOPS = [
  { id: "nepean-river", name: "Nepean River bridges loop", line: "x_amE_{qv[q@iA_AmAYOWB_@j@AiBMeAeB}BsBq@S]qAw@o@{AAu@sAeAu@gB{AcCmBgBwAoBmB_E_@qAw@y@K_CKa@oFwGoAmBsRyUcGoGkA}BcBkB[Ca@xAY^_@AoGaFiGeDeCcAaJsC~CBXNtB\\uB]YO_DC`JrCdCbAhGdDnG`F^@X_@`@yAqBy@eEtNZjHTtAL~HA|@u@C@`SId@HJHr@\\p@dIbIJj@bAbAHh@`@`@Xa@J@hQdQjAlBCPFLq@nADTQl@Pm@EUp@oALVpBzd@n@FXzDtQzBBT\\DAPfJjABSpEl@z@q@xBg@`@k@AUJQtFlFPEjCkDbBkATZwAp@q@z@ANP?|@g@zKoOPaA_CyCy@uB{@{A_AbAmA}@]c@]?cAScAy@sAmC_AgAOw@A}AYu@" },
  { id: "regatta", name: "Regatta Centre lap", line: "poylEm`sv[a@yCZc@DiBfAk@TxApBk_AE_A\\{JONHuDuC}Eo@b@gACfABn@c@tC|EjA}f@Vk@C`@Xa@ZKbFLXPTl@CrFmFf~BJ@KfF\\dBIp@I]wAbB_Ab@q@L{BWy@e@iAaEMBIa@_@yM|@_@^pC" },
  { id: "jamison-park", name: "Jamison Park laps", line: "f`amE}fvv[c@GZuEQKTu@Iu@[G|B_[EOwA}@DI~@l@n@VKtAT@tA]|BuBfBi@x@?hKhABSNBXqDzAN|@OZd@`@P`N|AYvDiAMML_BhUKA}@tK^HDRpBTqBUES_@IKFEn@{e@iFuA[a@fFb@F" },
  { id: "penrith-weir", name: "City to the Weir", line: "lq_mE{axv[q@u@I@[~CyDdYcBjJe@KQLa@tC_@|AWZm@ZSn@Ff@G\\e@x@_@fAWJAT_@b@Gt@Y?Gx@{@bCShAe@dAu@xBCZU^_Az@mAj@cFvAgBcAu@?oBj@{J{AzJzAnBk@t@?fBbAbFwAlAk@tA{AB[n@cBFeEYM{AbBIVUIl@{BNFMf@Lg@OG|AeFxBbAJZX?z@XZi@H?Bi@T?JLd@JzAL~@Cr@JpNl@jBf@tJjDjSdJ\\G\\Pd@gGa@CF_B[e@VYs]cf@BYYWGJeDoEsA{@CKHOYOWLkBgAzAcLEAFk@i@m@" },
  { id: "jordan-springs-lake", name: "Jordan Springs lakes", line: "jfylEkg}v[RSv@uBp@RPa@j@}DHuERKCIJW~@FKmCEIo@qS\\CBo@~BAGqJFGAuAAj@HH`CCrBi@FXKLFLnAOXL`@d@b@JBPhCi@@JtAIbJb@HD?Nd@@Ct@Hr@KbAJLpAXLj@EdAa@pD?RZNQCIFFpBIvBFnAb@fCgALKc@]FNfCCrFMFaC?Bl@GPLtClASNlAOmAmARM}Ci@AMMqG?s@DQGkE?ID_CEIDaFEs@lFc@MMVOBk@OEXsAa@w@tBSR" },
  { id: "wianamatta-trails", name: "Wianamatta trails", line: "thzlEc~}v[Np@cADBT}AR]}AmAiD]kBMoFF}B_@CMW?c@iGSMaL}A@a@INsGoCAHuDg@GWSo@_AEYSI}@qAUaAFONC?KUBIS@_@A^HRTC?Jv@Cd@K|@c@v@bBHb@HDrA|CDVlFy@HMLAI{APoFoA}FAwANw@vCyCIuFO}@Wk@cA}@[KkCM{@[iCqGcCqDm@q@aAg@_AUi@Jo@`@_@t@cB~NMd@kArAaHrGy@zBx@{B`HsGjAsA\\yBVb@D`A{ArEcArA\\jAUd@CXD\\nBgCbBeBd@St@BfC\\]lEZ`AjAfAPv@`@U~DUfAZjAaAb@o@Zu@XoAp@I`Ay@DzAwCxCOv@@vAnA|FQnFBx@D`@ZF@d@~BDCx@v@bG?h@jA?LF?|COLNl@HlJAfEn@jCbAb@XZu@pAQt@@d@Jd@b@@b@t@F^" },
  { id: "cranebrook", name: "Cranebrook parks loop", line: "f`xlEeaxv[@YiKkAe@a@}@uBtA{BLc@|AcVj@?p@_@FHlFhAEbKZlD^h@b@@vF_CpEwDv@iAd@eAf@qCGeDNC}@aLzB]bBeA^q@e@o@Uw@]sEDoB|@JFc@nANrAkH\\JRq@l@_EzBoBdAb@`B\\A}@PuAKe@OUBe@qAm@}FkEO^OAIJUWUf@Gq@qAsAe@y@yFs@JcBOgBg@wA{@sA]{@]}BgAJKkBD[Qm@WGPMs@\\{@Jm@uCq@Hw@E@OoEk@Y[_@QQBIVD\\iA`BqF~CmAd@SIQHIZcBh@sBOG`@q@MMbBQh@a@e@B{@I[HZCz@`@d@Pi@LcBdD`@j@IlAe@JBtDjDl@~@dAhE@x@h@^j@xANr@FxAIxCKb@aBrDS|BF`An@`Ed@|@x@r@H\\eBfVLDyC`e@SdAuAzB|@tBd@`@hKjAAX" },
]

// Google's encoded polyline format, 5 decimal places
export function decode(str) {
  const out = []
  let i = 0, lat = 0, lng = 0
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
      const d = result & 1 ? ~(result >> 1) : result >> 1
      if (which === 0) lat += d
      else lng += d
    }
    out.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return out
}
