import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface FadeInImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  blurClassName?: string
}

export function FadeInImage({
  className,
  blurClassName = "blur-md",
  onLoad,
  onError,
  ...props
}: FadeInImageProps) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [props.src])

  function markLoaded() {
    setLoaded(true)
  }

  return (
    <img
      ref={imgRef}
      {...props}
      onLoad={(event) => {
        markLoaded()
        onLoad?.(event)
      }}
      onError={(event) => {
        markLoaded()
        onError?.(event)
      }}
      className={cn(
        "transition-[opacity,filter] duration-500 ease-out will-change-[opacity,filter]",
        loaded ? "opacity-100 blur-0" : cn("opacity-0", blurClassName),
        className,
      )}
    />
  )
}
