"use client"

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface JsBarcodeProps {
  value: string;
  options?: JsBarcode.Options;
}

const JsBarcodeComponent: React.FC<JsBarcodeProps> = ({ value, options }) => {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      JsBarcode(ref.current, value, options);
    }
  }, [value, options]);

  return <svg ref={ref} />;
};

export default JsBarcodeComponent;
