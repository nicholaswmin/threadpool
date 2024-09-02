import test from 'node:test'

import { load } from '../../utils/index.js'
import { Threadpool } from '../../../index.js'

test('#on()', async t => {
  const pool = new Threadpool(load('pinger.js'))

  t.before(() => pool.start())
  t.after(()  => pool.stop())

  await t.test('listens for thread event', (t, done) => {
    const pids = new Map()

    pool.on('ping', ({ pid }) => pids.size < pool.size 
      ? pids.set(pid, true) 
      : done()
    )
  })
})


test('#once()', async t => {
  const pool = new Threadpool(load('pinger.js'))

  t.before(() => pool.start())
  t.after(() => pool.stop())

  await t.test('listens for thread event, once', (t, done) => {
    let timer  = null, 
      calls    = 0,
      listener = () => {
        ++calls > 1 ? done('listener fired > 1 times') : null
        clearTimeout(timer)
        timer = setTimeout(done, 50)
      }
    
    pool.once('ping', listener)
  })
})


test('#off()', async t => {
  const pool = new Threadpool(load('pinger.js'))

  t.before(() => pool.start())
  t.after(() => pool.stop())
  
  await t.test('removes specific listeners', (t, done) => {
    let timer = null, listener = () => {
      clearTimeout(timer)
      timer = setTimeout(done, 50)
      pool.off('ping', listener)
    }
    
    pool.on('ping', listener)
  })
})


test('#removeAllListeners()', async t => {
  const pool = new Threadpool(load('pinger.js'))

  t.before(() => pool.start())
  t.after(() => pool.stop())
  
  await t.test('removes all event listeners', (t, done) => {
    let timer = null, 
      listener1 = () => listener2(), 
      listener2 = () => {
        clearTimeout(timer)
        timer = setTimeout(done, 50)
        pool.removeAllListeners('ping')
      }

    pool.on('ping', listener1).on('ping', listener2)
  })
})
