import { useEffect, useRef, useState } from "react"
import demoVideo from "@/assets/welcome/flower.mp4?url"

import Controller from "@/components/Controller"

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
            src={demoVideo}
            ref={videoRef}></video>

          {video && <Controller id="test" video={video} />}
        </div>
      </div>
    </>
  )
}
