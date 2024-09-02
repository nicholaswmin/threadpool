// exits: 0 after cleanups
import { primary } from '../../index.js'

process.once('SIGTERM', () => {
  // suppose cleanups done ...

  setTimeout(() => process.exit(0))
})
