import test from 'node:test'

import { cp, load, dbouncer, randomUUID } from '../../utils/index.js'
import { Threadpool } from '../../../index.js'


const dead  = cp => !alive(cp)
const alive = cp => cp.exitCode === null & cp.signalCode === null


test('#stop()', async t => {
  cp.fork      = t.mock.fn(cp.fork)
  cp.instances = () => cp.fork.mock.calls.map(call => call.result)

  let pool     = null 

  t.afterEach(() => pool.stop())
  

  await t.test('stops threads', async t => {    
    t.before(() => {
      cp.fork.mock.resetCalls()
      pool = new Threadpool(load('ok.js'))

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
  

  await t.test('removes event listeners', async t => {
    let pool = null
    const dbounce = t.mock.fn(dbouncer(t._timer))

    t.beforeEach(async () => {
      pool = new Threadpool(load('pinger.js'))

      await pool.start()
    })


    await t.test('removes ".on()" listeners', async t => {
      await new Promise((resolve, reject) => {
        setTimeout(() => pool.stop().catch(reject), 50)
        pool.on('ping', e => dbounce(resolve, 20))
      })
    })
      

    await t.test('removes ".once()" listeners', async t => {
      await new Promise((resolve, reject) => {
        setTimeout(() => pool.stop().catch(reject), 10)

        const onOnce = (count = 1) => {
          if (++count > 100) 
            throw new Error('too much recursion - lower stop() timeout')

          dbounce(resolve, 20)
          
          pool.once('ping', onOnce.bind(null, count))
        } 

        onOnce()
      })
    })
  })
})
