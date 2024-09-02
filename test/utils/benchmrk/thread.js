import { primary } from '../../../index.js'

primary.on('ping', data => setImmediate(() => primary.emit('pong', data)))
