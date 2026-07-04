import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className={`toast ${toast.visible ? 'show' : ''} ${toast.type}`}>
      {toast.message}
    </div>
  );
}
