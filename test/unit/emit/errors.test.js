import test from 'node:test'

import { cp, load, mockInstanceMethods } from '../../utils/index.js'
import { Threadpool } from '../../../index.js'


const fork = cp.fork


test('#emit() non-started pool', async t => {
  const pool = new Threadpool(load('pong.js'))

  await t.test('rejects with error', async t => {
    await t.assert.rejects(pool.emit.bind(pool, 'foo'), {
      message: /not started/
    })
  })
})


test('#emit() stopped pool', async t => {
  const pool = new Threadpool(load('pong.js'))

  t.before(async () => {
    await pool.start()
    await pool.stop()
  })  

  await t.test('rejects with error', async t => {
    await t.assert.rejects(pool.emit.bind(pool, 'foo'), {
      message: /stopped/
    })
  })
})


test('#emit() IPC has error', async t => {
  cp.fork = t.mock.fn(fork)
  
  const pool = new Threadpool(load('pong.js'))

  t.before(() => pool.start()) 
  t.after(() => pool.stop())

  await t.test('rejects with error', async t => {
    cp.fork.mock.calls.map(mockInstanceMethods({
      send: (...args) => args.find(arg => arg instanceof Function)(
        new Error('Simulated Error')
      )
    }))

    await t.assert.rejects(pool.emit.bind(pool, 'foo'), {
      message: /Simulated Error/
    })
  })
})


test('#emit() IPC indicates rate limit', async t => {
  cp.fork = t.mock.fn(fork)
  
  const pool = new Threadpool(load('pong.js'))
  
  t.afterEach(() => pool.stop())
  t.before(() => pool.start())  

  await t.test('rejects with "rate exceeded" error', async t => {
    cp.fork.mock.calls.map(mockInstanceMethods({
      send: () => false
    }))

    await t.assert.rejects(pool.emit.bind(pool, 'foo'), {
      message: /rate exceeded/
    })
  })
})
