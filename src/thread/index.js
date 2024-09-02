import { EventEmitter, once } from 'node:events'
import { PrimaryBus } from '../bus/index.js'
import { isChildProcess, isInteger } from '../validate/index.js'

class Thread extends EventEmitter {
  #stderr = ''
  #forceKillTimer = null

  #pid = null
  #dead = false
  #alive = true

  get pid()        { return this.cp.pid             }
  get dead()       { return this.exitCode !== null  }
  get alive()      { return !this.dead              }

  get exitCode()   { return this.#computeExitCode() }
  get signalCode() { return this.cp.signalCode      }
  get connected()  { return this.cp.connected       }

  // @REVIEW 
  // These only exist because `Object.assign(this, cp)` throws w/o them
  set pid(pid)             {}
  set exitCode(code)       {}
  set signalCode(signal)   {}
  set connected(connected) {}
  
  constructor(cp, { parentId, readyTimeout, killTimeout }) {
    super()

    Object.defineProperties(this, {
      cp: {
        value: isChildProcess(cp, 'cp'),
        writable : false, enumerable : false, configurable : false
      },

      bus: {
        value: new PrimaryBus(cp, { id: parentId, readyTimeout, killTimeout }),
        writable : false, enumerable : false, configurable : false
      },

      readyTimeout: {
        value: isInteger(readyTimeout, 'readyTimeout'),
        writable : false, enumerable : false, configurable : false
      },

      killTimeout: {
        value: isInteger(killTimeout, 'killTimeout'),
        writable : false, enumerable : false, configurable : false
      }
    })

    Object.assign(this, cp)

    this.#addErrorListeners(this.cp)
  }
  
  ready() {
    return this.bus.readyHandshake()
  }
  
  async kill() {
    this.bus.stop()
    
    await Promise.race([
      this.#attemptForceKill(),
      this.#attemptGraceKill()
    ])

    this.#abortForceKill()

    return this.exitCode
  }
  
  emit(...args) {
    super.emit(...args)

    return this.bus.emit(...args)
  }
  
  on(...args) {
    super.on(...args)
    
    this.bus.on(...args)

    return this
  }
  
  removeAllListeners(...args) {
    this.bus.removeAllListeners(...args)
  }

  #attemptForceKill() {
    return new Promise((resolve, reject) => {
      this.#forceKillTimer = setTimeout(() => {
        this.#forceKillTimer = null

        return this.#forceKill()
          .then(this.#onceDead.bind(this))
          .then(resolve)
          .catch(reject.bind(this))
      }, this.killTimeout)
    })
  }
  
  #abortForceKill() {
    clearTimeout(this.#forceKillTimer)

    this.#forceKillTimer = null
  }

  #forceKill() {
    queueMicrotask(() => this.cp.kill('SIGKILL'))

    return this.#onceDead()
  }
  
  #attemptGraceKill() {
    queueMicrotask(() => this.cp.kill())

    return this.#onceDead()
  }
  
  #onceDead() {
    return Promise.race(['exit', 'error']
      .map(eventName => once(this.cp, eventName)))
  }
  
  #computeExitCode() {
    return this.cp.exitCode !== null 
      ? this.cp.exitCode : this.cp.signalCode !== null 
        ? this.cp.signalCode === 'SIGKILL' ? 1 : 0 : null
  }
  
  #addErrorListeners(cp) {
    const onError = err => 
      this.off('exit', onExit).emit('err', err)

    const onExit = (code, signal) => {
      const err = new Error(this.#stderr || signal) || null

      if (err)
        this.off('error', onError).emit('err', err)
    }

    if (cp.stderr)
      cp.stderr.on('data', data => this.#stderr += data.toString().trim())

    cp.once('exit', onExit.bind(this)).once('error', err => {
      return this.kill().then(onError.bind(this, err)).catch(killErr => {
        return onError(new Error(killErr, { cause: err }))
      })
    })
  }
}

export { Thread }
