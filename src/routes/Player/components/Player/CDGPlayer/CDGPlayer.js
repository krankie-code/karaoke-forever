import PropTypes from 'prop-types'
import React from 'react'
import CDGraphics from 'cdgraphics'
import HttpApi from 'lib/HttpApi'
const api = new HttpApi('media')

class CDGPlayer extends React.Component {
  static propTypes = {
    cdgAlpha: PropTypes.number.isRequired,
    cdgSize: PropTypes.number.isRequired,
    isPlaying: PropTypes.bool.isRequired,
    mediaId: PropTypes.number.isRequired,
    mediaKey: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    onAudioElement: PropTypes.func.isRequired,
    // media events
    onEnd: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
    onLoad: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onStatus: PropTypes.func.isRequired,
  }

  audio = React.createRef()
  canvas = React.createRef()
  frameId = null
  state = { CDGBackgroundColor: null }

  componentDidMount () {
    this.cdg = new CDGraphics(this.canvas.current, {
      forceKey: true,
      onBackgroundChange: this.handleCDGBackgroundChange,
      shadowBlur: Math.min(16, this.props.height * this.props.cdgSize * 0.0333),
    })

    this.props.onAudioElement(this.audio.current)
    this.props.onStatus({ isAlphaSupported: true })
    this.updateSources()
  }

  componentDidUpdate (prevProps) {
    if (prevProps.mediaKey !== this.props.mediaKey) {
      this.updateSources()
      return
    }

    if (prevProps.isPlaying !== this.props.isPlaying) {
      this.updateIsPlaying()
    }

    if (prevProps.width !== this.props.width ||
        prevProps.height !== this.props.height ||
        prevProps.cdgSize !== this.props.cdgSize) {
      this.cdg.setOptions({ shadowBlur: Math.min(16, this.props.height * this.props.cdgSize * 0.0333) })
    }
  }

  componentWillUnmount () {
    this.stopCDG()
  }

  render () {
    const { cdgAlpha, cdgSize, width, height } = this.props
    const style = {
      backgroundColor: 'transparent',
    }

    if (this.state.CDGBackgroundColor) {
      const [r, g, b, a] = this.state.CDGBackgroundColor // eslint-disable-line no-unused-vars
      style.backgroundColor = `rgba(${r},${g},${b},${cdgAlpha})`
    }

    // apply sizing as % of max height
    const wScale = width / 300
    const hScale = (height * cdgSize) / 216
    const scale = Math.min(wScale, hScale)

    return (
      <div style={style}>
        <canvas
          width={scale * 300}
          height={scale * 216}
          ref={this.canvas}
        />
        <br />
        <audio
          preload='auto'
          onCanPlayThrough={this.updateIsPlaying}
          onEnded={this.handleEnded}
          onError={this.handleError}
          onLoadStart={this.props.onLoad}
          onPlay={this.handlePlay}
          onTimeUpdate={this.handleTimeUpdate}
          ref={this.audio}
        />
      </div>
    )
  }

  updateSources = () => {
    this.stopCDG()

    // load .cdg file
    api('GET', `/${this.props.mediaId}?type=cdg`)
      .then(res => res.arrayBuffer())
      .then(res => {
        if (!this.audio.current) return

        this.cdg.load(new Uint8Array(res))
        this.audio.current.src = `/api/media/${this.props.mediaId}?type=audio`
        this.audio.current.load()
      }).catch(err => {
        this.props.onError(err.message)
      })
  }

  updateIsPlaying = () => {
    if (this.props.isPlaying) {
      this.audio.current.play()
        .catch(err => this.props.onError(err.message))
    } else {
      this.audio.current.pause()
      this.stopCDG()
    }
  }

  handleCDGBackgroundChange = color => {
    this.setState({ CDGBackgroundColor: color })
  }

  /*
  * <audio> event handlers
  */
  handleEnded = (el) => {
    this.props.onEnd()
    this.cdg.pause()
  }

  handleError = (el) => {
    const { message, code } = el.target.error
    this.props.onError(`${message} (code ${code})`)
  }

  handlePlay = () => {
    this.props.onPlay()
    this.startCDG()
  }

  handleTimeUpdate = () => {
    this.props.onStatus({
      position: this.audio.current.currentTime,
    })
  }

  /*
  * CDGraphics render loop
  */
  startCDG = () => {
    this.frameId = requestAnimationFrame(this.startCDG)
    this.cdg.render(this.audio.current.currentTime)
  }

  stopCDG = () => cancelAnimationFrame(this.frameId)
}

export default CDGPlayer
