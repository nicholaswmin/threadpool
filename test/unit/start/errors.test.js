import test from 'node:test'

import { cp, load } from '../../utils/index.js'
import { Threadpool } from '../../../index.js'

const alive = cp => cp.exitCode === null && cp.signalCode === null

test('#start() error cases', async t => {
  let pool

  cp.fork = t.mock.fn(cp.fork)
  cp.instances = () => cp.fork.mock.calls.map(call => call.result)

  
  await t.test('pool is stopped', async t => {    
    t.before(() => {
      cp.fork.mock.resetCalls()
      pool = new Threadpool(load('ok.js'))

      return pool.start()
    })

    await t.test('rejects with error', async t => {   
      await pool.stop()
      
      await t.assert.rejects(() => pool.start (), {
        message: /stopped/
      })
    })
  })

  

  await t.test('thread file does not import "primary" bus', async t => {
    t.before(() => {
      cp.fork.mock.resetCalls()
      pool = new Threadpool(load('no-bus.js'))
    })
    
    await t.test('rejects with error', async t => {   
      await t.assert.rejects(pool.start.bind(pool), {
        message: /Missing "spawned"/
      })
    })

    await t.test('all threads exit', t => {     
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })
  

  
  t.test('threads throw error on startup', async t => {
    t.beforeEach(() => {
      cp.fork.mock.resetCalls()

      pool = new Threadpool(load('spawn-err.js'))
    })
    
    await t.test('rejects with error', async t => {
      await t.assert.rejects(() => pool.start(), { message: /SIGKILL/ })
    })
    
    await t.test('all threads exit', async t => {  
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })

  

  await t.test('threads with blocked event loop', async t => {
    t.before(() => {
      cp.fork.mock.resetCalls()
      pool = new Threadpool(load('blocked-loop.js'))
    })
    
    await t.test('rejects with error', async t => {   
      await t.assert.rejects(pool.start.bind(pool), {
        message: /SIGKILL/
      })
    })

    await t.test('all threads exit', t => {     
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })
  

  
  await t.test('ChildProcess emits "error" after "spawn"', async t => {
    t.before(() => {
      cp.fork.mock.mockImplementationOnce((...args) => {
        const child = cp.fork(...args)
        
        child.once('spawn', () => {
          child.emit('error', new Error('Simulated CP Error'))
        })
        
        return child
      })
    })
  
    await t.test('rejects promise with relevent error', async t => {
      await t.assert.rejects(() => pool.start(), {
        name: 'Error', 
        message: /Simulated CP/ 
      })
    })
    
    await t.test('all threads exit', t => {     
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })
  

  
  await t.test('ChildProcess emits "error" after "spawn"', async t => {
    t.before(() => {
      cp.fork.mock.mockImplementationOnce((...args) => {
        const childProcess = cp.fork(...args)
          
        // `queueMicrotask` fires before `spawn`
        queueMicrotask(() => {
          childProcess.emit('error', new Error('Simulated CP Error'))
        })
        
        return childProcess
      })
    })
  
    await t.test('rejects promise', async t => {
      await t.assert.rejects(() => pool.start(), { 
        name: 'Error',
        message: /Simulated CP Err/ 
      })
    })
    
    await t.test('all threads exit', t => {     
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })
  
  

  await t.test('module path does not exist', async t => {
    const pool = new Threadpool('non-existent-file.js')
  
    cp.fork = t.mock.fn(cp.fork)
    cp.instances = () => cp.fork.mock.calls.map(call => call.result)
  
    await t.test('rejects promise with relevant error message', async t => {
      await t.assert.rejects(() => pool.start(), {
        name: 'Error', 
        message: /Cannot find/ 
      })
    })
  })
})
