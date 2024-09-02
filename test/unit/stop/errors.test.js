import test from 'node:test'

import { cp, load } from '../../utils/index.js'
import { Threadpool } from '../../../index.js'

const dead  = cp => !alive(cp)
const alive = cp => cp.exitCode === null & cp.signalCode === null


test('#stop() error cases', async t => {
  let pool     = null 

  cp.fork      = t.mock.fn(cp.fork)
  cp.instances = () => cp.fork.mock.calls.map(call => call.result)

  t.afterEach(() => pool.stop())
  
 
  await t.test('double stop() while previous is pending', async t => {    
    t.before(() => {
      cp.fork.mock.resetCalls()

      pool = new Threadpool(load('exit-ok.js'))
      
      return pool.start()
    })

    await t.test('both resolve', async t => {   
      await t.assert.doesNotReject(() => Promise.all([ 
        pool.stop(), pool.stop() 
      ]))
    })

    await t.test('all threads exit', t => {          
      t.assert.strictEqual(cp.instances().filter(dead).length, pool.size)
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })
  

  await t.test('threads SIGTERM handler exits: 0', async t => {    
    t.before(() => {
      cp.fork.mock.resetCalls()
      pool = new Threadpool(load('exit-ok.js'))

      return pool.start()
    })

    await t.test('resolves array of exit codes: 0', async t => {   
      const exitCodes = await pool.stop()
      
      t.assert.strictEqual(exitCodes.length, pool.size)
      t.assert.ok(exitCodes.every(code => code === 0), 'some exit codes !== 0')
    })

    await t.test('all threads exit', t => {          
      t.assert.strictEqual(cp.instances().filter(dead).length, pool.size)
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })


  await t.test('threads SIGTERM handler exits: 1', async t => {    
    t.before(() => {
      cp.fork.mock.resetCalls()
      pool = new Threadpool(load('exit-err.js'))
      
      return pool.start()
    })
    
    await t.test('resolves array of exit codes: 1', async t => {   
      const exitCodes = await pool.stop()
      
      t.assert.strictEqual(exitCodes.length, pool.size)
      t.assert.ok(exitCodes.every(code => code === 1), 'some exit codes !== 1')
    })
    
    await t.test('all threads exit', t => {      
      t.assert.strictEqual(cp.instances().filter(dead).length, pool.size)
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })
  
  
  await t.test('threads SIGTERM handler never exits', async t => {    
    t.before(() => {
      cp.fork.mock.resetCalls()
      pool = new Threadpool(load('exit-never.js'))
      
      return pool.start()
    })
    
    await t.test('resolves array of exit codes: 1', async t => {   
      const exitCodes = await pool.stop()

      t.assert.strictEqual(exitCodes.length, pool.size)
      t.assert.ok(exitCodes.every(code => code === 1), 'some exit codes !== 1')
    })
    
    await t.test('all threads exit', async t => {     
      t.assert.strictEqual(cp.instances().filter(dead).length, pool.size)
      t.assert.strictEqual(cp.instances().filter(alive).length, 0)
    })
  })
})
