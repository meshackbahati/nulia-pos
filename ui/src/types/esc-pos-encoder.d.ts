declare module 'esc-pos-encoder' {
    class EscPosEncoder {
        initialize(): this;
        codepage(value: string): this;
        text(value: string): this;
        newline(): this;
        line(value: string): this;
        underline(value: boolean | number): this;
        italic(value: boolean): this;
        bold(value: boolean): this;
        invert(value: boolean): this;
        width(value: number): this;
        height(value: number): this;
        size(width: number, height: number): this;
        font(value: string): this;
        align(value: 'left' | 'center' | 'right'): this;
        table(columns: any[]): this;
        rule(): this;
        box(data: any): this;
        barcode(value: string, type: string, height: number): this;
        qrcode(value: string): this;
        pdf417(value: string): this;
        image(value: any, width: number, height: number): this;
        cut(value?: 'full' | 'partial'): this;
        pulse(pin: number, on: number, off: number): this;
        raw(data: number[]): this;
        commands(data: number[]): this;
        columns(value: number): this;
        language(value: string): this;
        printerCapabilities(value: any): this;
        encode(): Uint8Array;
    }
    export default EscPosEncoder;
}
