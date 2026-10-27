import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ id, value, onChange, placeholder, autoComplete, required }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="input pr-11"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted dark:text-muted-dark hover:text-ink dark:hover:text-ink-dark transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
