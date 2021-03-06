/**
 * This module bridges some Media methods over IPC so those
 * that write to the db can be done in the server process
 */
const log = require('../lib/logger')(`scanner[${process.pid}]`)
const {
  MEDIA_ADD,
  MEDIA_CLEANUP,
  MEDIA_REMOVE,
  MEDIA_UPDATE,
} = require('../../shared/actionTypes')

const refs = {}
let actionId = 0

// listen for action success/error
process.on('message', async function (action) {
  const { meta, error } = action

  if (!meta || !meta.ipcActionId || !refs[meta.ipcActionId]) {
    log.debug('ignoring action %s', JSON.stringify(action))
    return
  }

  const ref = refs[meta.ipcActionId]

  if (error) {
    ref.reject(error)
  }

  ref.resolve(action.payload)
  delete refs[meta.ipcActionId]
})

function sendAction (type, payload) {
  const id = ++actionId
  const promise = new Promise((resolve, reject) => {
    refs[id] = { resolve, reject }
  })

  process.send({
    type: type,
    meta: {
      ipcActionId: id,
    },
    payload,
  })

  return promise
}

module.exports = {
  add: sendAction.bind(null, MEDIA_ADD),
  cleanup: sendAction.bind(null, MEDIA_CLEANUP),
  remove: sendAction.bind(null, MEDIA_REMOVE),
  update: sendAction.bind(null, MEDIA_UPDATE),
}
