// primary.js
import test from 'node:test'
import { join } from 'node:path'
import { Threadpool } from '../../index.js'

test('e2e: ping-pong', async t => {
  const pool = new Threadpool(join(import.meta.dirname, 'thread.js'), 4)

  await t.test('instantiates', t => {
    t.assert.ok(pool)
    t.assert.strictEqual(pool.size, 4)
  })
  
  await t.test('starts up', async t => {
    await pool.start()
  })
  
  await t.test('ping-pongs', async t => {
    await new Promise((resolve, reject) => {
      try {
        pool
          .on('pong', data => {
            resolve(data)

            pool.emit('ping', { foo: 'bar' })
              .catch(reject)
          })
          .emit('ping', { foo: 'bar' })
          .catch(reject)
      } catch (err) {
        reject(err)
      }
    })
  })
  
  await t.test('stops', async t => {
    await pool.stop()
  })
})
