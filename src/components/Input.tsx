'use client';

import React, { ChangeEventHandler, FC, useState } from 'react';

const Input : FC<{value:string,onChange:ChangeEventHandler<HTMLInputElement> , placeholder?:string, name:string}> = ({value,onChange,placeholder, name}) => {
  const [isFocused, setIsFocused] = useState(false);

  const shouldFloat = isFocused || value;

  return (
    <div className="relative mt-8 w-full max-w-md mx-auto">
      <input
        id="input-field"
        type="text"
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={onChange}
        className="block w-full border-0 border-b-2 border-gray-300 bg-transparent px-2.5 pb-2.5 pt-4 text-base text-black focus:border-black focus:outline-none peer"
        placeholder={placeholder}
      />
      <label
        htmlFor="input-field"
        className={`absolute left-2.5 top-2 text-gray-400 transition-all duration-200
        ${shouldFloat ? 'text-xs -top-2.5 text-black' : 'text-base top-4'}
        `}
      >
        {name}
      </label>
      <span
        className={`absolute bottom-0 left-0 h-0.5 bg-black transition-all duration-300 ${
          isFocused ? 'w-full' : 'w-0'
        }`}
      />
    </div>
  );
};

export default Input;
