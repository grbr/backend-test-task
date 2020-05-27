const http = require('http')
const https = require('https')

// resolves with ping result after site response
let pingId = 0
function pingTargetSite () {
  pingId++
  // start timestamp
  const date = ts()
  // wait for response
  return new Promise((resolve, reject) => {
    // requests https://fundraiseup.com/
    const req = https.request({
      method: 'GET',
      hostname: 'fundraiseup.com',
      port: 443,
      path: '/',
      headers: { 'Content-Type': 'application/json' }
    },
    // got response
    () => {
      req.destroy()
      resolve({
        pingId,
        date,
        responseTime: ts() - date
      })
    })
    .on('timeout', reject)
    .on('error', reject)
    .end()
  })
}

// resolves with a server response message and statusCode
// when data was successfully posted
function tryPostJsonData ({ opts, data }) {
  return new Promise((resolve, reject) => {
    const reqBody = JSON.stringify(data)
    let resBody = []
    let startedAt = ts()
    const req = http.request(opts, res => {
      res
      // collect chunks
      .on('data', chunk => resBody.push(chunk))
      // response ready
      .on('end', () => {
        const { statusCode } = res
        // succesed
        if (statusCode === 200) {
          // return only message and HTTP status code
          resolve({
            message: Buffer.concat(resBody).toString(),
            statusCode
          })
        } else {
          reject(new Error(`Server did not respond OK. statusCode=${statusCode}`))
        }
      })
    })
    // reject on timeout or error
    .on('timeout', () => reject(new Error(`Request timeout: ${ts() - startedAt}ms`)))
    .on('error', reject)
    req.write(reqBody)
    req.end()
  })
}

// retries posting ping result until success
async function deliverToServer (data) {
  let deliveryAttempt = 1
  let delivered = false
  // initial delay in milliseconds
  let delay = 100
  const { pingId } = data
  // repeat with exponential delays
  while (!delivered) {
    try {
      console.log('client> sending ping result', { pingId, deliveryAttempt })
      const serverResponse = await tryPostJsonData({
        // HTTP request options
        opts: {
          hostname: 'localhost',
          port: 8080,
          path: '/data',
          method: 'POST',
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        },
        // add deliveryAttempt value to the request data
        data: Object.assign(data, { deliveryAttempt })
      })
      console.log(`client> delivered`, { pingId, deliveryAttempt }, { serverResponse })
      // done
      delivered = true
    } catch (err) {
      // deal with a failed attempt
      console.error(
        `client> delivery attemp failed: "${err ? err.message : null}". repeat after ${delay}ms`,
        { pingId, deliveryAttempt }
      )
      // wait a delay
      await delayAsync(delay)
      // increase delay exponentially
      delay *= 2
      // increase attempts counter
      deliveryAttempt++
    }
  }
}

// resoleves after <ms> milliseconds
function delayAsync (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

// returns timestamp in milliseconds. f.e.: 1590571754368
function ts () {
  return (new Date()).getTime()
} 

// plans ping every 1s and publishes the result on the server
setInterval(() => {
  pingTargetSite()
  .then(deliverToServer)
  .catch(err => console.error('client> ping error:', err))
}, 1000)
