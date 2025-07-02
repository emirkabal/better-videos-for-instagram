import { useEffect, useRef, useState } from "react"

import Controller from "~components/Controller"

export default function App() {
  const videoRef = useRef(null)
  const [video, setVideo] = useState<HTMLVideoElement | null>()

  useEffect(() => {
    setVideo(videoRef.current)
  }, [videoRef])

  return (
    <>
      <div className="demo-container">
        <div className="player">
          <video
            onClick={() => {
              if (video?.paused) video?.play()
              else video?.pause()
            }}
            src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            ref={videoRef}></video>

          {video && <Controller id="test" video={video} />}
        </div>
      </div>
    </>
  )
}
