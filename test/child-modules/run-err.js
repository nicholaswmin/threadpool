// spawns OK but exits: 1 during runtime
import { primary } from '../../index.js'

setTimeout(() => {
  throw new Error('Simulated Runtime Error')
}, 100)
