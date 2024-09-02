// exits: 1 during exit cleanups
import { primary } from '../../index.js'

process.once('SIGTERM', () => process.exit(1))
