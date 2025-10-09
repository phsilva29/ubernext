import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ 
  length = 6, 
  value, 
  onChange, 
  disabled = false,
  className = '',
  error = false
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    // Atualizar OTP interno quando valor externo muda
    const newOtp = value.split('').slice(0, length);
    while (newOtp.length < length) {
      newOtp.push('');
    }
    setOtp(newOtp);
  }, [value, length]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (disabled) return;
    
    const inputValue = element.value.replace(/\D/g, ''); // Apenas números
    
    if (inputValue.length > 1) {
      // Handle paste de múltiplos caracteres
      const pastedData = inputValue.slice(0, length);
      const newOtp = pastedData.split('');
      while (newOtp.length < length) {
        newOtp.push('');
      }
      setOtp(newOtp);
      onChange(pastedData);
      
      // Focar no último campo preenchido
      const nextIndex = Math.min(pastedData.length - 1, length - 1);
      setTimeout(() => inputRefs.current[nextIndex]?.focus(), 0);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = inputValue;
    setOtp(newOtp);
    onChange(newOtp.join(''));

    // Auto-navegar para próximo campo
    if (inputValue !== '' && index < length - 1) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index]) {
        // Se tem valor, limpar campo atual
        newOtp[index] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
      } else if (index > 0) {
        // Se não tem valor, ir para campo anterior e limpar
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      onChange(newOtp.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      const newOtp = pastedData.split('');
      while (newOtp.length < length) {
        newOtp.push('');
      }
      setOtp(newOtp);
      onChange(pastedData);
      
      // Focar no último campo preenchido ou no primeiro vazio
      const nextIndex = Math.min(pastedData.length, length - 1);
      setTimeout(() => inputRefs.current[nextIndex]?.focus(), 0);
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  return (
    <div className={cn("flex gap-3 justify-center items-center", className)}>
      {otp.map((digit, index) => (
        <div key={index} className="relative">
          <input
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={digit}
            maxLength={1}
            disabled={disabled}
            className={cn(
              // Base styles - tema escuro elegante
              "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-center text-lg sm:text-xl md:text-2xl font-bold rounded-xl border-2 transition-all duration-300 ease-in-out",
              "focus:outline-none focus:ring-0 backdrop-blur-sm shadow-lg",
              // Normal state - tema escuro
              {
                "border-gray-700 bg-gray-800/90 text-gray-200 shadow-gray-900/20": !error && !disabled && focusedIndex !== index && !digit,
                // Filled state - azul escuro elegante
                "border-blue-500/70 bg-gradient-to-br from-blue-900/70 to-blue-800/70 text-blue-100 shadow-blue-900/40 transform scale-105": !error && !disabled && digit && focusedIndex !== index,
                // Focused state - destaque azul brilhante
                "border-blue-400 bg-gradient-to-br from-blue-900/80 to-blue-800/80 text-blue-100 shadow-xl ring-4 ring-blue-500/30 scale-110 transform": !error && !disabled && focusedIndex === index,
                // Error state - vermelho escuro elegante
                "border-red-500/70 bg-gradient-to-br from-red-900/70 to-red-800/70 text-red-100 shadow-red-900/40": error && !disabled && focusedIndex !== index,
                "border-red-400 bg-gradient-to-br from-red-900/80 to-red-800/80 text-red-100 shadow-xl ring-4 ring-red-500/30 scale-110": error && !disabled && focusedIndex === index,
                // Disabled state - cinza escuro
                "border-gray-600 bg-gray-700/50 text-gray-500 cursor-not-allowed": disabled,
              },
              // Hover effects - brilho sutil
              !disabled && focusedIndex !== index && "hover:border-blue-500/50 hover:bg-gray-750/90 hover:shadow-lg hover:scale-105 transform hover:shadow-blue-900/20"
            )}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            aria-label={`Dígito ${index + 1} do código de verificação`}
          />
          
          {/* Indicador visual de preenchimento - tema escuro */}
          {digit && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 pointer-events-none animate-pulse" />
          )}
          
          {/* Efeito de brilho para campos preenchidos */}
          {digit && focusedIndex !== index && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/10 to-transparent pointer-events-none" />
          )}
        </div>
      ))}
    </div>
  );
};

export default OTPInput;