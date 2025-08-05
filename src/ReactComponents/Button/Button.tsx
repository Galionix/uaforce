// a simple button component that can have text and onclick handler
import React from 'react';

export interface ButtonProps {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  text,
  onClick,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      className={`custom-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};