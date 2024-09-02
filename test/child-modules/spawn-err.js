// throws synchronous exception on-load on 1st thread spawn

import { primary } from '../../index.js'

if (+process.env.INDEX === 0)
  throw new Error('Simulated Spawn Error')
