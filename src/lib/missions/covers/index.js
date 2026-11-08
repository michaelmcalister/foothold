// Cover art for the newer series. covers.js calls each draw with its helpers.
import { COVER as deepcover } from './deepcover.js'
import { COVER as timerunners } from './timerunners.js'
import { COVER as velocity } from './velocity.js'

export const COVERS = [deepcover, timerunners, velocity].filter((c) => c.draw)
