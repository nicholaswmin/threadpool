// takes too long (30 secs) to exit after SIGTERM 
import { primary } from '../../index.js'

process.once('SIGTERM', () => setTimeout(() => process.exit(0), 30 * 1000))
