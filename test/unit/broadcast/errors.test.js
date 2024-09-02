import test from 'node:test'
import { cp, load, mockInstanceMethods, dbouncer } from '../../utils/index.js'
import { Threadpool } from '../../../index.js'

const fork = cp.fork

test('#broadcast() parallel instances', async t => {  
  const pools = [
    new Threadpool(load('pong.js')),
    new Threadpool(load('pong.js')),
    new Threadpool(load('pong.js'))
  ]
  
  t.before(() => Promise.all(pools.map(pool => pool.start())))  
  t.after(() => Promise.all(pools.map(pool => pool.stop())))  

  await t.test('each pool gets its own pongs, only', async t => {
    const pongs = await Promise.all(pools.map((pool, i) => 
      new Promise((resolve, reject) => {
        const dbounce = t.mock.fn(dbouncer(t._timer))
  
        pool.on('pong', () => dbounce(() => resolve({ 
            got: dbounce.mock.callCount(), 
            exp: pool.size 
          }), 50)
        )
        .broadcast('ping')
        .catch(reject)
  
      })
    ))
    
    t.plan(pools.length)

    pongs.forEach(({ got, exp }, i) => {
      t.assert.strictEqual(got, exp, `${i}, expected: ${exp}, got: ${got}`)
    })
  })
})

test('#broadcast() non-started pool', async t => {
  const pool = new Threadpool(load('pong.js'))

  await t.test('rejects with error', async t => {
    await t.assert.rejects(pool.broadcast.bind(pool, 'foo'), {
      message: /not started/
    })
  })
})

test('#broadcast() stopped pool', async t => {
  const pool = new Threadpool(load('pong.js'))

  t.before(async () => {
    await pool.start()
    await pool.stop()
  })  

  await t.test('rejects with error', async t => {
    await t.assert.rejects(pool.broadcast.bind(pool, 'foo'), {
      message: /stopped/
    })
  })
})

test('#broadcast() IPC has error', async t => {
  cp.fork = t.mock.fn(fork)

  const pool = new Threadpool(load('pong.js'))

  t.before(() => pool.start()) 
  t.after(() => pool.stop())

  await t.test('rejects with callback error', async t => {
    cp.fork.mock.calls.map(mockInstanceMethods({
      send: (...args) => args.find(arg => arg instanceof Function)(
        new Error('Simulated Error')
      )
    }))

    await t.assert.rejects(pool.broadcast.bind(pool, 'foo'), {
      message: /Simulated Error/
    })
  })
})


test('#broadcast() IPC indicates rate limit', async t => {
  cp.fork = t.mock.fn(fork)

  const pool = new Threadpool(load('pong.js'))
  
  t.after(() => pool.stop())
  t.before(() => pool.start())  

  await t.test('rejects with "rate exceeded" error', async t => {
    cp.fork.mock.calls.map(mockInstanceMethods({
      send: () => false
    }))

    await t.assert.rejects(pool.broadcast.bind(pool, 'foo'), {
      message: /rate exceeded/
    })
  })
})
