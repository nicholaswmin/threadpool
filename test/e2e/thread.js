// thread.js 

import { primary } from '../../index.js'

primary.on('ping', data => {
  console.log('ping 🏓')

  setTimeout(() => primary.emit('pong', data), 100)
})
