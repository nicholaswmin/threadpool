import { availableParallelism } from 'node:os'
import { EventEmitter } from 'node:events'
import { emitWarning, argv } from 'node:process'
import { randomUUID } from 'node:crypto'

import fork from './src/fork/index.js'
import { Thread } from './src/thread/index.js'
import { PrimaryBus, ThreadBus } from './src/bus/index.js'
import { isObject, isInteger, isString } from './src/validate/index.js'

class Threadpool extends EventEmitter {
  static spawnTimeout = 250
  static readyTimeout = 250
  static killTimeout  = 250

  #starting  = false
  #stopping  = false  
  #nextIndex = 0
  
  get #ready() {
    return this.threads.every(t => t.alive)
  }

  get started() {
    return !!this.threads.length
  }
  
  get stopped() {
    return this.started && !this.#ready
  }

  constructor(
    path = argv.at(-1), 
    size = +process.env.POOL_CONCURRENCY || availableParallelism(),  
    env = {}) {
    super()

    Object.defineProperties(this, {
      id: {
        value: randomUUID(),
        writable : false, enumerable : false, configurable : false
      },

      spawnTimeout: {
        value: isInteger(Threadpool.spawnTimeout, 'spawnTimeout'),
        writable : false, enumerable : false, configurable : false
      },

      readyTimeout: {
        value: isInteger(Threadpool.readyTimeout, 'readyTimeout'),
        writable : false, enumerable : false, configurable : false
      },

      killTimeout: {
        value: isInteger(Threadpool.killTimeout, 'killTimeout'),
        writable : false, enumerable : false, configurable : false
      },

      path: {
        value: isString(path, 'path'),
        writable : false, enumerable : false, configurable : false
      },

      size: {
        value: isInteger(size, 'size'),
        writable : false, enumerable : false, configurable : false
      },
      
      env: {
        value: isObject(env, 'env'),
        writable : false, enumerable : false, configurable : false
      },

      threads: {
        value: [], 
        writable : true, enumerable : true, configurable : false
      }
    })
  }
  
  async start() {
    if (this.#stopping)
      return emitWarning('start() ignored, startup in progress.')

    if (this.stopped)
      throw new Error('cannot start() a stopped pool')

    this.#starting = true

    const forks = []

    for (let i = 0; i < this.size; i++) {
      forks.push(await this.#createThread(this.path, {
        ...process.env, ...this.env
      }, i))
    }

    this.threads = Object.freeze(forks)

    this.#starting = false

    return this.threads
  }

  async stop() {
    this.threads.map(thread => thread.removeAllListeners())

    const exits = thread => thread.exitCode,
          alive = this.threads.filter(thread => thread.alive) 

    if (this.#stopping) {
      emitWarning('stop() ignored, shutdown in progress.')

      return []
    }

    this.#stopping = true

    const deaths = alive.map(thread => thread.kill())
    
    await Promise.all(deaths)

    this.#stopping = false

    return this.threads.map(exits)
  }
  
  emit(name, data) {
    if (this.stopped)
      return Promise.reject(new Error('Cannot emit. Pool stopped.'))
    
    if (!this.started)
      return Promise.reject(new Error('Cannot emit. Pool not started.'))

    const thread = this.#nextThread()

    super.emit(name, data)
    
    return thread.emit(name, data)
  }
  
  broadcast(...args) {
    if (this.stopped)
      return Promise.reject(new Error('Cannot broadcast. Pool stopped.'))
    
    if (!this.started)
      return Promise.reject(new Error('Cannot broadcast. Pool not started.'))

    return this.threads.length 
      ? Promise.all(this.threads.map(thread => thread.bus.emit(...args))) 
      : Promise.reject(new Error('Cannot broadcast on a non-started pool'))
  }
  
  on(name, listener) {
    this.threads.forEach(thread => thread.bus.on(name, listener))
    
    return this
  }
  
  once(name, listener) {
    const once = (...args) => {
      this.threads.forEach(thread => thread.bus.off(name, once))

      return listener(...args)
    }

    this.threads.forEach(thread => thread.bus.once(name, once))

    super.on(name, listener)

    return this
  }
  
  off(name, listener) {
    this.threads.forEach(thread => thread.bus.off(name, listener))
    
    return this
  }
  
  removeAllListeners(name) {
    this.threads.forEach(thread => 
      thread.bus.removeAllListeners(name))
    
    super.removeAllListeners(name)
    
    return this
  }
  
  #nextThread() {
    this.#nextIndex = this.#nextIndex < Number.MAX_SAFE_INTEGER 
      ? this.#nextIndex : 0

    return this.threads[++this.#nextIndex % this.threads.length]
  }
  
  async #createThread (path, env, index) {
    const childProcess = await fork(path, {
      ...env,
      IS_THREAD: 1,
      PARENT_ID: this.id,
      INDEX: index
    }, {
      spawnTimeout: this.spawnTimeout
    }) 

    const thread = new Thread(childProcess, {
      parentId: this.id,
      readyTimeout: this.readyTimeout,
      killTimeout: this.killTimeout
    })

    thread.on('err', this.#onThreadError.bind(this))

    thread.stdout.on('data', data => console.log(data.toString()))    
    thread.stderr.on('data', data => {
      const message = data.toString().trim()

      message.toLowerCase().includes('simulated') 
        ? console.info('ignored simulated test error')
        : console.error(message)
    })
        
    await thread.ready()

    return thread
  }

  #onThreadError(err) {   
    return !this.#stopping 
      ? this.stop()
        .then(() => {
          super.emit('pool-error', err)
        })
        .catch(nexterr => {
          super.emit('pool-error', new Error(nexterr, { 
            cause: err 
          }))
          
          return Promise.resolve()
        })
      : false
  }
}

const primary = Object.hasOwn(process.env, 'IS_THREAD')
  ? new ThreadBus({ 
      killTimeout: Threadpool.killTimeout, 
      readyTimeout: Threadpool.readyTimeout 
    }) 
  : null

export { Threadpool, primary }
