// emits `pong` in response to a `ping`, ASAP but w/o blocking the evt. loop
import { primary } from '../../index.js'

primary.on('ping', data => setImmediate(() => primary.emit('pong', data)))
