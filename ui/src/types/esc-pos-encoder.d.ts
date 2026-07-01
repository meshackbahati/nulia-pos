declare module 'esc-pos-encoder' {
    class EscPosEncoder {
        initialize(): this;
        align(value: 'left' | 'center' | 'right'): this;
        bold(value?: boolean): this;
        style(options: { bold?: boolean; font?: string; width?: number; height?: number; italic?: boolean; underline?: boolean }): this;
        text(value: string): this;
        newline(): this;
        cut(value?: 'partial' | 'full'): this;
        encode(): Uint8Array;
    }
    export default EscPosEncoder;
}
