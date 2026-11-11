// The newer mission series, each in its own file: its episodes, cast, cover
// look and recorded sound prompts (pure data, so the app and the worker can
// both use it). thrillers.js, cast.js and audio/library.js take them from
// here. A series with no episodes yet is left out.
import * as deepcover from './deepcover.js'
import * as timerunners from './timerunners.js'
import * as velocity from './velocity.js'
import * as penrith from './penrith.js'
import * as twocities from './twocities.js'
import * as bondi from './bondi.js'
import * as druitt from './druitt.js'
import * as sydney from './sydney.js'
import * as tiger from './tiger.js'

export const SERIES = [deepcover, timerunners, velocity, penrith, twocities, bondi, druitt, sydney, tiger].filter((s) => s.EPISODES.length)
