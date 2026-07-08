import { useEffect, useRef, useState } from "react"

export type ToastData = {
  message: string
  type: "success" | "error"
}

type ToastProps = ToastData & {
  onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onCloseRef.current(), 300)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2147483647,
        pointerEvents: "none"
      }}
      className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-opacity duration-300 max-w-[90%] text-center whitespace-nowrap ${
        visible ? "opacity-100" : "opacity-0"
      } ${type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
      {message}
    </div>
  )
}
