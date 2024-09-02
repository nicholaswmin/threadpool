import { loadavg } from 'node:os'
import { path, size, kibs } from './params.js'
import { Threadpool } from '../../../index.js'

// Bechmark code

console.log('starting up...')

let pool = new Threadpool(path, size), 
    payload = 'A'.repeat(kibs * 1000),
    ticks = 0,
    pings = 0, 
    pongs = 0

await pool.start()

pool.on('pong', () => setImmediate(() => {
  if (++pongs % pool.size === 0)
    pool.broadcast('ping', { payload }), ++pings
}))

// Stats

setInterval(() => {
  if (ticks === 0) 
    pool.broadcast('ping')
  
  console.clear()

  console.table([{
    'ticks': ++ticks,
    'pings/sec': Math.round(pings / ticks),
    'pongs/sec': Math.round(pongs / ticks),
    'ping (mb/sec)': Math.round(pings / ticks * kibs / 1000), 
    'pong (mb/sec)': Math.round(pongs / ticks * kibs / 1000)
  }])

  console.log('\n', 
    'threads:', size, '|', 'payload (KB):', kibs, '\n\n',
    'Load avg. (1 min):', Math.round(loadavg()[0]), '|',
    'Memory usage (mb):', Math.round(process.memoryUsage().heapUsed / 1000000)
  )
}, 1000)

// Graceful exit

process.on('beforeExit', async () => {
  await pool.stop()
})
