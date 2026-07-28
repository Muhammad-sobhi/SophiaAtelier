import { createContext, useContext, useState } from 'react';import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";

const DirectionContext = /*#__PURE__*/createContext(undefined);

export function DirectionProvider({ children }) {
  const [direction, setDirection] = useState('rtl');

  const toggleDirection = () => {
    setDirection((prev) => prev === 'ltr' ? 'rtl' : 'ltr');
  };

  return (/*#__PURE__*/
    _jsxDEV(DirectionContext.Provider, { value: { direction, toggleDirection }, children: /*#__PURE__*/
      _jsxDEV("div", { dir: direction, children:
        children }, void 0, false
      ) }, void 0, false
    ));

}

export function useDirection() {
  const context = useContext(DirectionContext);
  if (!context) {
    throw new Error('useDirection must be used within DirectionProvider');
  }
  return context;
}