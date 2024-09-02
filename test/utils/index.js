import cp from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

const mockInstanceMethods = fns => ({ result }) => Object.assign(
  result, Object.keys(fns).reduce((instance, fn) => ({ 
    [fn]: fns[fn].bind(instance) 
  }), result)
)

const load = file => join(import.meta.dirname, `../child-modules/${file}`)

const dbouncer = t => (fn, ms) => t = clearTimeout(t) || setTimeout(fn, ms)

export { cp, randomUUID, mockInstanceMethods, load, dbouncer }
