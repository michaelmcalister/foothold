-- Personal bests and strongholds: best efforts on each activity, each player's records, named landmark loops and the efforts on them.
-- Only adds tables and a column. Seeds the seven Penrith and Jordan Springs loops from src/lib/api/areas/penrith.js
-- (traced on OpenStreetMap footpaths, (c) OpenStreetMap contributors, ODbL).

-- Best efforts found in the activity: { key: seconds }, plus longest: metres for rides (src/lib/engine/bests.js)
ALTER TABLE activities ADD COLUMN bests TEXT;

-- Each player's records per map. value is seconds (fastest over the distance) or metres (longest ride).
CREATE TABLE personal_bests (
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  key TEXT NOT NULL,
  value REAL NOT NULL,
  activity_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, mode, key)
);

-- Named closed routes. line is a Google encoded polyline (5 decimal places); the bounds find nearby ones.
CREATE TABLE strongholds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  line TEXT NOT NULL,
  min_lat REAL NOT NULL,
  max_lat REAL NOT NULL,
  min_lng REAL NOT NULL,
  max_lng REAL NOT NULL,
  distance_m REAL NOT NULL,
  area TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX strongholds_bounds ON strongholds (min_lat, max_lat, min_lng, max_lng);

-- One row each time someone completes a stronghold (at most one per activity per stronghold)
CREATE TABLE stronghold_efforts (
  id TEXT PRIMARY KEY,
  stronghold_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  at INTEGER NOT NULL,                  -- when the effort started
  elapsed_s REAL NOT NULL
);
CREATE INDEX stronghold_efforts_board ON stronghold_efforts (stronghold_id, mode, at);
CREATE INDEX stronghold_efforts_user ON stronghold_efforts (user_id, stronghold_id);
CREATE INDEX stronghold_efforts_activity ON stronghold_efforts (activity_id);

INSERT INTO strongholds (id, name, line, min_lat, max_lat, min_lng, max_lng, distance_m, area, created_at) VALUES
  ('nepean-river', 'Nepean River bridges loop', 'x_amE_{qv[q@iA_AmAYOWB_@j@AiBMeAeB}BsBq@S]qAw@o@{AAu@sAeAu@gB{AcCmBgBwAoBmB_E_@qAw@y@K_CKa@oFwGoAmBsRyUcGoGkA}BcBkB[Ca@xAY^_@AoGaFiGeDeCcAaJsC~CBXNtB\uB]YO_DC`JrCdCbAhGdDnG`F^@X_@`@yAqBy@eEtNZjHTtAL~HA|@u@C@`SId@HJHr@\p@dIbIJj@bAbAHh@`@`@Xa@J@hQdQjAlBCPFLq@nADTQl@Pm@EUp@oALVpBzd@n@FXzDtQzBBT\DAPfJjABSpEl@z@q@xBg@`@k@AUJQtFlFPEjCkDbBkATZwAp@q@z@ANP?|@g@zKoOPaA_CyCy@uB{@{A_AbAmA}@]c@]?cAScAy@sAmC_AgAOw@A}AYu@', -33.76529, -33.74260, 150.65748, 150.68479, 9284, 'penrith', 0),
  ('regatta', 'Regatta Centre lap', 'poylEm`sv[a@yCZc@DiBfAk@TxApBk_AE_A\{JONHuDuC}Eo@b@gACfABn@c@tC|EjA}f@Vk@C`@Xa@ZKbFLXPTl@CrFmFf~BJ@KfF\dBIp@I]wAbB_Ab@q@L{BWy@e@iAaEMBIa@_@yM|@_@^pC', -33.72623, -33.72250, 150.66836, 150.69286, 5633, 'penrith', 0),
  ('jamison-park', 'Jamison Park laps', 'f`amE}fvv[c@GZuEQKTu@Iu@[G|B_[EOwA}@DI~@l@n@VKtAT@tA]|BuBfBi@x@?hKhABSNBXqDzAN|@OZd@`@P`N|AYvDiAMML_BhUKA}@tK^HDRpBTqBUES_@IKFEn@{e@iFuA[a@fFb@F', -33.76963, -33.76127, 150.68788, 150.69542, 3536, 'penrith', 0),
  ('penrith-weir', 'City to the Weir', 'lq_mE{axv[q@u@I@[~CyDdYcBjJe@KQLa@tC_@|AWZm@ZSn@Ff@G\e@x@_@fAWJAT_@b@Gt@Y?Gx@{@bCShAe@dAu@xBCZU^_Az@mAj@cFvAgBcAu@?oBj@{J{AzJzAnBk@t@?fBbAbFwAlAk@tA{AB[n@cBFeEYM{AbBIVUIl@{BNFMf@Lg@OG|AeFxBbAJZX?z@XZi@H?Bi@T?JLd@JzAL~@Cr@JpNl@jBf@tJjDjSdJ\G\Pd@gGa@CF_B[e@VYs]cf@BYYWGJeDoEsA{@CKHOYOWLkBgAzAcLEAFk@i@m@', -33.76094, -33.74412, 150.68396, 150.69769, 6084, 'penrith', 0),
  ('jordan-springs-lake', 'Jordan Springs lakes', 'jfylEkg}v[RSv@uBp@RPa@j@}DHuERKCIJW~@FKmCEIo@qS\CBo@~BAGqJFGAuAAj@HH`CCrBi@FXKLFLnAOXL`@d@b@JBPhCi@@JtAIbJb@HD?Nd@@Ct@Hr@KbAJLpAXLj@EdAa@pD?RZNQCIFFpBIvBFnAb@fCgALKc@]FNfCCrFMFaC?Bl@GPLtClASNlAOmAmARM}Ci@AMMqG?s@DQGkE?ID_CEIDaFEs@lFc@MMVOBk@OEXsAa@w@tBSR', -33.72928, -33.72150, 150.72390, 150.73351, 3838, 'penrith', 0),
  ('wianamatta-trails', 'Wianamatta trails', 'thzlEc~}v[Np@cADBT}AR]}AmAiD]kBMoFF}B_@CMW?c@iGSMaL}A@a@INsGoCAHuDg@GWSo@_AEYSI}@qAUaAFONC?KUBIS@_@A^HRTC?Jv@Cd@K|@c@v@bBHb@HDrA|CDVlFy@HMLAI{APoFoA}FAwANw@vCyCIuFO}@Wk@cA}@[KkCM{@[iCqGcCqDm@q@aAg@_AUi@Jo@`@_@t@cB~NMd@kArAaHrGy@zBx@{B`HsGjAsA\yBVb@D`A{ArEcArA\jAUd@CXD\nBgCbBeBd@St@BfC\]lEZ`AjAfAPv@`@U~DUfAZjAaAb@o@Zu@XoAp@I`Ay@DzAwCxCOv@@vAnA|FQnFBx@D`@ZF@d@~BDCx@v@bG?h@jA?LF?|COLNl@HlJAfEn@jCbAb@XZu@pAQt@@d@Jd@b@@b@t@F^', -33.72707, -33.71784, 150.72705, 150.74566, 6901, 'penrith', 0),
  ('cranebrook', 'Cranebrook parks loop', 'f`xlEeaxv[@YiKkAe@a@}@uBtA{BLc@|AcVj@?p@_@FHlFhAEbKZlD^h@b@@vF_CpEwDv@iAd@eAf@qCGeDNC}@aLzB]bBeA^q@e@o@Uw@]sEDoB|@JFc@nANrAkH\JRq@l@_EzBoBdAb@`B\A}@PuAKe@OUBe@qAm@}FkEO^OAIJUWUf@Gq@qAsAe@y@yFs@JcBOgBg@wA{@sA]{@]}BgAJKkBD[Qm@WGPMs@\{@Jm@uCq@Hw@E@OoEk@Y[_@QQBIVD\iA`BqF~CmAd@SIQHIZcBh@sBOG`@q@MMbBQh@a@e@B{@I[HZCz@`@d@Pi@LcBdD`@j@IlAe@JBtDjDl@~@dAhE@x@h@^j@xANr@FxAIxCKb@aBrDS|BF`An@`Ed@|@x@r@H\eBfVLDyC`e@SdAuAzB|@tBd@`@hKjAAX', -33.72280, -33.71066, 150.69731, 150.71978, 7629, 'penrith', 0);
