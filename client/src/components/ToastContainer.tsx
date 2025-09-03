import Toast, { ToastMessage } from './Toast'

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemoveToast: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  console.log('🍞 ToastContainer render - toasts:', toasts.length)
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        pointerEvents: 'none',
        border: '2px solid red', // DEBUG: Make container visible
        backgroundColor: 'rgba(255, 0, 0, 0.1)' // DEBUG: Add background
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={onRemoveToast}
          />
        ))}
      </div>
    </div>
  )
}

export default ToastContainer