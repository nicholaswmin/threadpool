import test from 'node:test'
import { Threadpool } from '../../../index.js'


test('#constructor()', async t => {
  await t.test('no arguments provided', async t => {
    await t.test('instantiates ok', t => {
      t.assert.ok(() => new Threadpool())
    })

    await t.test('uses defaults', async t => {
      const { path, size } = new Threadpool()

      await t.test('path set to current file path', t => {
        t.assert.strictEqual(path, process.argv.at(-1))
      })

      await t.test('pool size set to positive integer', t => {
        t.assert.ok(size > 0, 'thread size is: <= 0')
        t.assert.ok(Number.isInteger(size), 'thread size !== integer')
      })
    })
  })
  

  await t.test('all arguments provided in valid format', async t => {
    await t.test('instantiates ok', t => {
      t.assert.ok(new Threadpool('task.js', 4, { foo: 'bar' }))
    })
  })
  
  
  await t.test('"path" provided', async t => {
    await t.test('empty', async t => {
      await t.test('throws RangeError', t => {
        t.assert.throws(() => new Threadpool(null, 'a'), { name: 'RangeError' })
      })
    })
  })
  
  
  await t.test('"size" provided', async t => {
    await t.test('as a string', async t => {
      await t.test('throws RangeError', t => {
        t.assert.throws(() => new Threadpool(null, 'a'), { name: 'RangeError' })
      })
    })
    
    await t.test('as a positive fractional number', async t => {
      await t.test('throws RangeError', t => {
        t.assert.throws(() => new Threadpool(null, 3.1), { name: 'RangeError' })
      })
    })
    
    await t.test('as a negative integer', async t => {
      await t.test('throws RangeError', t => {
        t.assert.throws(() => new Threadpool(null, -3), { name: 'RangeError' })
      })
    })
    
    await t.test('as zero', async t => {
      await t.test('throws RangeError', t => {
        t.assert.throws(() => new Threadpool(null, 0), { name: 'RangeError' })
      })
    })
    
    await t.test('setting process.env.POOL_CONCURRENCY', async t => {
      t.before(() => process.env.POOL_CONCURRENCY = 7)
      t.after(() => delete process.env.POOL_CONCURRENCY)

      await t.test('overrides default pool.size value', t => {
        const pool = new Threadpool()

        t.assert.strictEqual(pool.size, 7)
      })
      
      await t.test('does not override explicit pool.size', t => {
        const pool = new Threadpool(null, 3, { foo: 'bar' })

        t.assert.strictEqual(pool.size, 3)
      })
    })
  })
  
  
  await t.test('"env" provided', async t => {
    await t.test('as a non-object', async t => {
      await t.test('throws TypeError', t => {
        t.assert.throws(() => new Threadpool(null, 3, 'f'), { 
          name: 'TypeError' 
        })
      })
    })
    
    await t.test('without any properties', async t => {
      await t.test('instantiates ok', t => {
        t.assert.ok(new Threadpool(null, 3, {}))
      })
    })
  })
})
