// Cover art for the newer series. covers.js calls each draw with its helpers.
import { COVER as deepcover } from './deepcover.js'
import { COVER as timerunners } from './timerunners.js'
import { COVER as velocity } from './velocity.js'
import { COVER as penrith } from './penrith.js'
import { COVER as twocities } from './twocities.js'
import { COVER as bondi } from './bondi.js'
import { COVER as druitt } from './druitt.js'
import { COVER as sydney } from './sydney.js'

export const COVERS = [deepcover, timerunners, velocity, penrith, twocities, bondi, druitt, sydney].filter((c) => c.draw)
