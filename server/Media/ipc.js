const log = require('../lib/logger')('Media:IPC')
const Media = require('./Media')
const {
  MEDIA_ADD,
  MEDIA_CLEANUP,
  MEDIA_REMOVE,
  MEDIA_UPDATE,
  SCANNER_WORKER_DONE,
  SCANNER_WORKER_STATUS,
  _SUCCESS,
  _ERROR,
} = require('../../shared/actionTypes')

const ACTION_HANDLERS = {
  [MEDIA_ADD]: async ({ payload }) => Media.add(payload),
  [MEDIA_CLEANUP]: Media.cleanup,
  [MEDIA_REMOVE]: async ({ payload }) => Media.remove(payload),
  [MEDIA_UPDATE]: async ({ payload }) => Media.update(payload),
}

/**
 * Provides an IPC interface to methods that write to db
 */
module.exports = function (io) {
  process.on('message', async function (action) {
    const { type } = action

    // ignore some actions to reduce logging noise
    if (type === SCANNER_WORKER_STATUS || type === SCANNER_WORKER_DONE) {
      return
    }

    if (typeof ACTION_HANDLERS[type] !== 'function') {
      log.warn('no handler for ipc action: %s', type)
      return
    }

    try {
      const res = await ACTION_HANDLERS[type](action)

      process.send({
        ...action,
        type: type + _SUCCESS,
        payload: res,
      })
    } catch (err) {
      process.send({
        ...action,
        type: type + _ERROR,
        error: err,
      })

      log.debug(`error in ipc action ${type}: ${err.message}`)
    }
  })
}
