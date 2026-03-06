declare module 'ofx-js' {
    function parse(data: string): Promise<Record<string, unknown>>
    export { parse }
}
