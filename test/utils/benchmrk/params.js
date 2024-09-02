import { join } from 'node:path'
import { availableParallelism } from 'node:os'
import { parseArgs } from 'node:util'

let path = join(import.meta.dirname, 'thread.js') 
let { values: { type, size, kibs }  } = parseArgs({ 
  options: { 
    size: { type: 'string', default: availableParallelism().toString() },
    kibs: { type: 'string', default: '1' }
  }
})

size = +size, kibs = +kibs

export { path, size, kibs }
