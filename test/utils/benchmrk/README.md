# benchmark

Messaging between `primary` & `threads`.

- A `ping` is sent to all threads, simulaneously, in fan-out.
- To avoid an exponentially-increasing send rate, each `ping` is sent when 
  *all* `pongs` are received.  
  `1` ping = `n` pongs, where `n` is the number of threads.
- The `ping` event `data` is resent to the primary in each `pong`.

Events are scheduled with [`setImmediate`][setimmediate].  

IPC via [`process.send`][procsend].

## Run

> 4 threads, 5 kb of `ping` event `data`:

```bash
node primary.js --size=4 --kibs=5
```

### Parameters:

- `--size` : `Number` : thread count.
- `--kibs` : `Number` : kilobytes of `ping` event `data` payload.

## Authors

[@nicholaswmin][nicholaswmin]

## License 

MIT

[procsend]: https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback
[setimmediate]: https://nodejs.org/en/learn/asynchronous-work/understanding-setimmediate

[nicholaswmin]: https://github.com/nicholaswmin
