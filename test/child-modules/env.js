// pongs back its `process.env`
import { primary } from '../../index.js'

primary.on('ping', () => setImmediate(() => primary.emit('pong', process.env)))
