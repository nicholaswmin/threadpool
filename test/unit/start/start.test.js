import test from 'node:test'

import { cp, load } from '../../utils/index.js'
import { Threadpool } from '../../../index.js'


const alive = cp => cp.exitCode === null && cp.signalCode === null 


test('#start()', async t => {
  let pool     = null 


  cp.fork      = t.mock.fn(cp.fork)
  cp.instances = () => cp.fork.mock.calls.map(call => call.result)


  t.afterEach(() => pool.stop())


  await t.test('threads spawn normally', async t => {
    t.before(() => {
      cp.fork.mock.resetCalls()

      pool = new Threadpool(load('ok.js'))
      
      return pool.start()
    })
    

    await t.test('all running ok', t => {
      t.assert.strictEqual(cp.instances().filter(alive).length, pool.size)
    })

    
    await t.test('as many as specified', async t => {
      t.assert.strictEqual(cp.instances().length, pool.size) 
    })
    

    await t.test('as independent processes', t => {
      cp.instances().forEach(p => t.assert.strictEqual(typeof p.pid, 'number'))
    })
  })


  await t.test('sets threads .env variables', async t => {
    let env = null


    t.before(async () => {
      pool = new Threadpool(load('env.js'), 2, { FOO: 'foo', BAR: '1' })
      
      await pool.start()

      env = await new Promise(resolve => 
        pool.once('pong', resolve).emit('ping'))
    })


    await t.test('user-configured .env vars', async t => { 
      await t.test('FOO', t => {
        t.assert.ok(!!env.FOO, 'missing env. variable "FOO"')
        t.assert.strictEqual(env.FOO, 'foo')
      })
      

      await t.test('BAR', t => {
        t.assert.ok(!!env.BAR, 'missing env. variable "BAR"')
        t.assert.strictEqual(+env.BAR, 1)
      })
    })
    

    await t.test('system set env. vars', async t => {
      await t.test('IS_THREAD', async t => { 
        t.assert.ok(Object.hasOwn(env, 'IS_THREAD'), 'missing env.IS_THREAD')
        t.assert.strictEqual(!!env.IS_THREAD, true)
        t.assert.strictEqual(!!process.env.IS_THREAD, false)
      })


      await t.test('PARENT_ID', async t => { 
        t.assert.ok(Object.hasOwn(env, 'PARENT_ID'), 'missing env.PARENT_ID')
        t.assert.strictEqual(env.PARENT_ID, pool.id, 'pool.id != env.PARENT_ID')
      })
      

      await t.test('INDEX', async t => { 
        t.assert.ok(Object.hasOwn(env, 'INDEX'), 'missing env.INDEX')
      })
    })
  })
})
