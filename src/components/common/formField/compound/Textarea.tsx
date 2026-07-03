'use client';

import { forwardRef, useRef, useEffect, useCallback, RefObject } from 'react';
import debounce from 'lodash.debounce';
import clsx from 'clsx';
import { COMMON_TEXTFIELD_STYLE } from '../style';
import { TextareaProps } from '../type';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ rightSlot = null, height = 24, isBorder = true, className, ...rest }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const resolvedRef = (ref as RefObject<HTMLTextAreaElement>) ?? innerRef;

    const resizeTextareaHeight = useCallback(() => {
      const textarea = resolvedRef.current;

      if (textarea) {
        textarea.style.height = `${height}px`;
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [height, resolvedRef]);

    useEffect(() => {
      const handleDebounce = debounce(resizeTextareaHeight, 100);

      window.addEventListener('resize', handleDebounce);

      return () => {
        window.removeEventListener('resize', handleDebounce);
        handleDebounce.cancel();
      };
    }, [resizeTextareaHeight]);

    return (
      <div
        className={clsx(
          'bg-bg200 flex w-full items-start gap-2',
          isBorder && 'border-border rounded-xl border px-4 py-2.5'
        )}
      >
        <textarea
          {...rest}
          ref={resolvedRef}
          onInput={resizeTextareaHeight}
          className={clsx(
            'flex w-full resize-none items-center justify-center pt-1',
            COMMON_TEXTFIELD_STYLE,
            className
          )}
          style={{
            height: `${height}px`,
          }}
        />
        {rightSlot}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
