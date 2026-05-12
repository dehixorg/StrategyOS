import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let _addToast = null

export function useToast() {
  return useContext(ToastContext)
}

// Can be called outside React components
export const toast = {
  success: (msg) => _addToast?.({ type: 'success', msg }),
  error:   (msg) => _addToast?.({ type: 'error',   msg }),
  info:    (msg) => _addToast?.({ type: 'info',    msg }),
}

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}

const COLORS = {
  success: 'bg-green-900/90 border-green-600 text-green-100',
  error:   'bg-red-900/90 border-red-600 text-red-100',
  info:    'bg-indigo-900/90 border-indigo-600 text-indigo-100',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const addToast = useCallback(({ type, msg }) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, type, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  _addToast = addToast

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm pointer-events-auto
              backdrop-blur-sm animate-[slideIn_0.2s_ease] ${COLORS[t.type]}`}
          >
            <span className="font-bold text-base leading-none mt-0.5">{ICONS[t.type]}</span>
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 leading-none text-lg">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
