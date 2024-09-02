import { EventEmitter } from 'node:events'
import { isChildProcess, isInteger, isString } from '../validate/index.js'

class Bus extends EventEmitter {
  #emittedWarnings = {}

  constructor(name = 'bus') {
    super()
    this.name = isString(name, 'name')
    this.stopped = false
  }
  
  stop() {
     this.stopped = true
     this.removeAllListeners()
   } 

  canEmit() {
    if (this.stopped)
      return false

    return !this.stopped
  }
}

class PrimaryBus extends Bus {
  constructor(cp, { id, readyTimeout, killTimeout }) {
    super('primary')

    this.cp  = isChildProcess(cp, 'cp')
    this.id  = isString(id, 'id')
    this.pid = isString(this.cp.pid.toString(), 'cp.pid')

    this.readyTimeout = isInteger(readyTimeout, 'readyTimeout')
    this.killTimeout  = isInteger(killTimeout, 'killTimeout')

    if (this.canListen())
      this.cp.on('message', args => {
        if (!args.includes('emit'))
          return

        super.emit(args.at(0), { ...args.at(1), pid: args.at(-1) })
      })
  }
  
  canEmit() {
    return !this.stopped && this.cp.connected
  }
  
  canListen() {
    return this.cp.connected
  }
  
  emit(...args) {
    return new Promise((resolve, reject) => {
      if (!this.canEmit())
        return resolve(false)
      
      const sent = this.cp.send(Object.values({ 
        ...args, 
        from: 'emit', 
        parentId: this.id, 
        pid: this.pid
      }), err => {    
        if (err) return reject(err)
      })
      
      process.nextTick(() => sent 
        ? resolve(true) 
        : reject(new Error('IPC rate exceeded.'))
      )
    })
  }
  
  readyHandshake() {
    if (this.ready) 
      return resolve()

    return new Promise((resolve, reject) => {
      const readyTimer = setTimeout(() => {
        const errmsg = [ 
          `primary: thread ${this.cp.pid}:`, 
          `"ready-pong" not received in: ${this.readyTimeout} ms timeout.`,
        ].join(' ')

        const exit = err => {
          clearTimeout(sigkillTimer)
          this.cp.off('exit', onExitEvent)
          reject(err)
        }

        const onTimeout = () => 
          exit(new Error(`${errmsg} SIGKILL cleanup timed-out.`))

        const onExitEvent = () => 
          exit(new Error(`${errmsg} SIGKILL cleanup succeeded.`))

        const sigkillTimer = setTimeout(onTimeout, this.killTimeout)

        this.cp.once('exit', onExitEvent)
        
        if (!this.cp.kill(9))
          reject(new Error(`${errmsg} SIGKILL cleanup signal failed.`))
      }, this.readyTimeout)

      this.once('ready-pong', err => {
        clearTimeout(readyTimer)

        return resolve()
      })
      
      return this.emit('ready-ping').catch(reject)
    })
  }
}

class ThreadBus extends Bus {
  constructor({ readyTimeout }) {
    super('thread')

    this.pid = isString(process.pid.toString(), 'process.pid')
    this.parentId = isString(process.env.PARENT_ID.toString(), 'env.PARENT_ID')
    this.error = false
    
    this.readyTimeoutTimer = setTimeout(() => {
      console.error([ 
        `thread: ${this.pid}:`, 
        `"ready-ping" not received in: ${readyTimeout} ms timeout.`,
        'Exiting with code: 1.'
      ].join(','))

      process.exit(1)
    }, isInteger(readyTimeout, 'readyTimeout'))
    
    process.on('message', args => {
      if (!this.canListen())
        return

      if (!args.includes('emit'))
        return

      const forPid = args.at(-1), fromParentId = args.at(-2)
      
      if (forPid !== this.pid || fromParentId !== this.parentId) 
        return

      if (args.includes('ready-ping')) {
        clearTimeout(this.readyTimeoutTimer)
        this.emit('ready-pong', {})     
      }

      super.emit(...args) 
    })
    
    process.on('uncaughtException', error => {
      this.error = error.toString()

      console.error(error)

      throw error
    })  
  
    process.send('spawned')  
  }
  
  stop() {
    super.stop()
    process.disconnect()
  }

  canListen() {
    return process.connected && !this.error
  }

  emit(...args) {
    return new Promise((resolve, reject) => {
      if (!this.canEmit())
        return resolve(false)
      
      const sent = process.send(Object.values({ 
        ...args, from: 'emit', pid: this.pid
      }), err => {    
        if (err) return reject(err)
      })
      
      return process.nextTick(() => sent 
        ? resolve(true) 
        : (() => {
          this.error = new Error('IPC rate exceeded.')
          
          return reject(error)
        })()
      )
    })
  }
}

export { PrimaryBus, ThreadBus }
