[![test-url][test-badge]][test-url] [![dep-url][dep-badge]][dep-url] 

# :thread: threadpool

> thread pool with [ergonomic IPC](#messaging)

## Install

```bash
npm i @nicholaswmin/threadpool
```

## Example

> messaging between the [primary][parent-proc] and `4` threads:

```js
// primary.js

import { Threadpool } from '@nicholaswmin/threadpool'

const pool = new Threadpool('thread.js', 4)

await pool.start()

pool
  .on('pong', () => {
    console.log('🏓 pong')
    pool.emit('ping')
  })
  .emit('ping')
```

and:

```js
// thread.js 

import { primary } from '@nicholaswmin/threadpool'

primary.on('ping', () => {
  console.log('ping 🏓')

  setTimeout(() => primary.emit('pong'), 100)
})
```

then:

```bash
node primary.js
```

logs:

```bash
# ping 🏓
# 🏓 pong
# ping 🏓
# 🏓 pong
# ...
```

## API

#### `new Threadpool(path, size, env)`

Creates a pool.  

| name         | type     | description              | default               |
|--------------|----------|--------------------------|-----------------------|
| `path`       | `String` | file path of thread code | current path          |
| `size`       | `Number` | number of threads        | available cores       |
| `env`        | `Object` | Thread env. variables    | primary `process.env` |


### Start/Stop

#### `await pool.start()`

Starts the pool.

#### `await pool.stop()`

Shutsdown all threads, removes all listeners and stops the pool

Returns array of [exit codes][ecodes].  


### Messaging

> `primary-to-thread` [IPC][ipc]:

#### `pool.on(name, listener)`

Listens for an emitted event, across all threads.

| name       | type       | description       |
|------------|------------|-------------------|
| `name`     | `String`   | name of event     |
| `listener` | `Function` | callback function |

#### `pool.once(name, listener)`

Listens for an emitted event once, across all threads.  
As soon as the listener fires it is removed.

#### `pool.off(name, listener)`

Removes a listener of a given event, across all threads.

#### `pool.removeAllListeners(name)`

Removes all listeners of a given event, across all threads.

#### `pool.emit(name, data)`

Sends the event to a *single* thread, chosen in [round-robin][rr].


#### `pool.broadcast(name, data)`

Sends the event to *every* thread, in [fan-out][fanout]


### Emitted Events

#### `'pool-error'` 

Emitted if an uncaught error is thrown in a thread.    
The error is provided as an `Error` in a `listener` argument.

A shutdown is attempted before emitting this event.   

If the shutdown fails, the `Error` instance will contain the shutdown error 
and the `error.cause` will contain the originating thread error.


## Thread API

#### `thread.pid`

Thread's [Process ID][pid]

#### `thread.exitCode`

- `null`: is alive
- `0`: exited with `exit-code: 0` 
- `1`: threw uncaught exception or killed with any signal other than `SIGTERM`.


## Primary API

> For `thread-to-primary` [IPC][ipc], for usage in the thread code file

#### `primary.on(name, listener)`

Listen for events emitted from the primary.

#### `primary.emit(name, data)`

Emit an event to the primary.

## Graceful exits

Use [`beforeExit`][bexit] to call `pool.stop()`, like so:

```js
// primary.js

process.on('beforeExit', async () => {
  try {
    await pool.stop()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})
```

### Timeouts

Threads which [block the event loop][ee-block] or delay their termination are 
issued a [`SIGKILL`][signals] signal, after a set timeout.

timeouts are in `ms` and can be set like so:

```js
import { Threadpool } from '@nicholaswmin/threadpool'

Threadpool.spawnTimeout = 500
Threadpool.readyTimeout = 500
Threadpool.killTimeout  = 500

const pool = new Threadpool('thread.js')

// ... rest of code
```


## Gotchas 

- Runtime exceptions trigger a shutdown/stop.
- Cyclic `pool.broadcast`s can create an  *exponentially-increasing* send rate.
- Based on [`fork()`][fork] so technically it's [multi-processing][child-p],
  each "thread" being an isolated [V8][v8] instance.


## Test 

```bash 
NODE_ENV=test node --run test
```

> test coverage saved as: `test/lcov.info`


### Benchmark

> Run a [ping/pong benchmark][benchmark]   

```bash 
node --run benchmark -- --size=4 --kibs=10
```

> 4 threads, each `ping` sending 10 kilobytes of event data


## Contributing

Follows [Semver][sv], [Github Flow][gh-flow] & [Conventional Commits][ccom].   

## Authors

[@nicholaswmin][nicholaswmin]

## License 

[The MIT License][license]


[test-badge]: https://github.com/nicholaswmin/threadpool/actions/workflows/test.yml/badge.svg
[test-url]: https://github.com/nicholaswmin/threadpool/actions/workflows/test.yml
[dep-badge]: https://img.shields.io/badge/dependencies-0-b.svg
[dep-url]: https://blog.author.io/npm-needs-a-personal-trainer-537e0f8859c6

[ipc]: https://en.wikipedia.org/wiki/Inter-process_communication
[bexit]: https://nodejs.org/api/process.html#event-beforeexit
[parent-proc]: https://en.wikipedia.org/wiki/Parent_process
[fork]: https://nodejs.org/api/child_process.html#child_processforkmodulepath-args-options
[env]: https://nodejs.org/api/process.html#processenv
[ee]: https://nodejs.org/docs/latest/api/events.html#emitteremiteventname-args
[ecodes]: https://en.wikipedia.org/wiki/Exit_status
[node-signals]: https://nodejs.org/api/process.html#signal-events
[signals]: https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html
[pid]: https://en.wikipedia.org/wiki/Process_identifier
[ee-block]: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
[rr]: https://en.wikipedia.org/wiki/Round-robin_scheduling
[fanout]: https://en.wikipedia.org/wiki/Fan-out_(software)#Message-oriented_middleware
[grace]: https://en.wikipedia.org/wiki/Graceful_exit
[child-p]: https://en.wikipedia.org/wiki/Child_process
[gh-flow]: https://docs.github.com/en/get-started/using-github/github-flow
[ccom]: https://www.conventionalcommits.org/en/v1.0.0/
[semver]: https://semver.org/
[v8]: https://v8.dev/

[benchmark]: ./test/utils/benchmrk
[nicholaswmin]: https://github.com/nicholaswmin
[license]: ./LICENSE
