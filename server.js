const http = require('http')

http.createServer((req, res) => {
  const { method, url } = req
  if (url === '/data' && method === 'POST') {
    // route found
    let body = []
    req
    .on('error', err => { console.error(err) })
    .on('data', chunk => { body.push(chunk) })
    .on('end', () => {
      // pasring request's body
      let msg
      try {
        msg = JSON.parse(Buffer.concat(body).toString())
      } catch (err) {
        // isn't JSON parsable?
        res.statusCode = err instanceof SyntaxError ? 400 : 500
        res.end()
        // finish processing
        return
      }
      // handling endpoint
      const rnd = Math.random()
      if (rnd < .6) {
        // 60% "OK" behavior. logging request messages
        console.log('server>', msg)
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.write('OK')
        res.end()
      } else if (rnd < .8) {
        // 20% "500" behavior
        res.statusCode = 500
        res.end()
      } else {
        // 20% "no response" behavior
      }
    })
  } else {
    res.statusCode = 404
    res.end()
  }
}).listen(8080)
